import { SchemaContract, type ISchemaContract } from './SchemaContract.model';
import { History } from '../../models/History.model';

// ===== Types =====

export interface SchemaViolation {
  field: string;
  type: 'missing_field' | 'type_change' | 'unexpected_field' | 'null_value';
  message: string;
}

interface InferredField {
  type: string;
  nullable: boolean;
  children?: Record<string, InferredField>;
  itemType?: InferredField;
}

// ===== Constants =====

/** Minimum successful responses required before inferring a schema */
const MIN_SAMPLES = 3;
/** Max violations stored per contract */
const MAX_VIOLATIONS = 50;

// ===== Service =====

/**
 * Schema Validator Service — infers schemas from historical responses
 * and validates new responses against them.
 */
export class SchemaValidatorService {
  /**
   * After a successful response, update or infer the schema for this endpoint.
   * Returns violations if a schema contract already exists.
   */
  async processResponse(
    userId: string,
    method: string,
    url: string,
    status: number,
    body: unknown,
  ): Promise<SchemaViolation[]> {
    // Only process 2xx responses with JSON bodies
    if (status < 200 || status >= 300) return [];
    if (!body || typeof body !== 'object') return [];

    const endpointKey = this.buildEndpointKey(method, url);
    const existing = await SchemaContract.findOne({ userId, endpointKey });

    if (!existing) {
      // First time seeing this endpoint — start collecting
      await this.startInference(userId, method, url, endpointKey, body);
      return [];
    }

    if (existing.sampleCount < MIN_SAMPLES) {
      // Still collecting samples — merge into the schema
      await this.mergeIntoSchema(existing, body);
      return [];
    }

    // We have a contract — validate the new response against it
    const violations = this.validate(body, existing.contractSchema, '');

    // Store violations
    if (violations.length > 0) {
      const now = new Date();
      const newViolations = violations.map((v) => ({
        ...v,
        detectedAt: now,
      }));

      // Keep only the latest MAX_VIOLATIONS
      const combined = [...(existing.violations || []), ...newViolations];
      existing.violations = combined.slice(-MAX_VIOLATIONS) as typeof existing.violations;
      await existing.save();
    }

    // Also continue learning — merge schema for stability
    await this.mergeIntoSchema(existing, body);

    return violations;
  }

  /**
   * Get the schema contract for an endpoint.
   */
  async getContract(
    userId: string,
    method: string,
    url: string,
  ): Promise<ISchemaContract | null> {
    const endpointKey = this.buildEndpointKey(method, url);
    return SchemaContract.findOne({ userId, endpointKey });
  }

  /**
   * List all contracts for a user.
   */
  async listContracts(userId: string): Promise<ISchemaContract[]> {
    return SchemaContract.find({ userId })
      .sort({ updatedAt: -1 })
      .lean() as unknown as ISchemaContract[];
  }

  /**
   * Delete a contract (reset inference).
   */
  async deleteContract(userId: string, contractId: string): Promise<boolean> {
    const result = await SchemaContract.deleteOne({ _id: contractId, userId });
    return result.deletedCount > 0;
  }

  /**
   * Force re-inference from history for an endpoint.
   */
  async reInfer(userId: string, method: string, url: string): Promise<ISchemaContract | null> {
    const endpointKey = this.buildEndpointKey(method, url);

    // Delete existing contract
    await SchemaContract.deleteOne({ userId, endpointKey });

    // Load recent successful history entries
    const histories = await History.find({
      userId,
      'request.method': method.toUpperCase(),
      'response.status': { $gte: 200, $lt: 300 },
    })
      .sort({ executedAt: -1 })
      .limit(10)
      .lean();

    // Filter to matching URL paths
    const pathPattern = this.extractPath(url);
    const matching = histories.filter((h) => {
      const hPath = this.extractPath(h.request.url);
      return hPath === pathPattern;
    });

    if (matching.length < MIN_SAMPLES) return null;

    // Infer schema from all matching responses
    let schema: Record<string, unknown> = {};
    for (const h of matching) {
      if (h.response?.body && typeof h.response.body === 'object') {
        schema = this.mergeSchemas(schema, this.inferSchema(h.response.body));
      }
    }

    const contract = new SchemaContract({
      userId,
      endpointKey,
      method: method.toUpperCase(),
      pathPattern,
      contractSchema: schema,
      sampleCount: matching.length,
      lastInferredAt: new Date(),
      violations: [],
    });

    return contract.save();
  }

  // ===== Private Methods =====

  private buildEndpointKey(method: string, url: string): string {
    const path = this.extractPath(url);
    return `${method.toUpperCase()} ${path}`;
  }

  private extractPath(url: string): string {
    try {
      const parsed = new URL(url);
      // Normalize ID segments: /users/123 → /users/:id
      return parsed.pathname.replace(/\/[0-9a-f]{24}/gi, '/:id').replace(/\/\d+/g, '/:id');
    } catch {
      return url.replace(/\/[0-9a-f]{24}/gi, '/:id').replace(/\/\d+/g, '/:id');
    }
  }

  private async startInference(
    userId: string,
    method: string,
    url: string,
    endpointKey: string,
    body: unknown,
  ): Promise<void> {
    const schema = this.inferSchema(body);
    await SchemaContract.create({
      userId,
      endpointKey,
      method: method.toUpperCase(),
      pathPattern: this.extractPath(url),
      contractSchema: schema,
      sampleCount: 1,
      lastInferredAt: new Date(),
      violations: [],
    });
  }

  private async mergeIntoSchema(
    contract: ISchemaContract,
    body: unknown,
  ): Promise<void> {
    const newSchema = this.inferSchema(body);
    contract.contractSchema = this.mergeSchemas(
      contract.contractSchema as Record<string, unknown>,
      newSchema,
    );
    contract.sampleCount += 1;
    contract.lastInferredAt = new Date();
    await contract.save();
  }

  /**
   * Infer a simplified schema from a JSON value.
   * Returns: { type, nullable, children (for objects), itemType (for arrays) }
   */
  private inferSchema(value: unknown): Record<string, unknown> {
    if (value === null || value === undefined) {
      return { type: 'null', nullable: true };
    }

    if (Array.isArray(value)) {
      const itemSchema = value.length > 0
        ? this.inferSchema(value[0])
        : { type: 'unknown' };
      return { type: 'array', nullable: false, itemType: itemSchema };
    }

    if (typeof value === 'object') {
      const children: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        children[key] = this.inferSchema(val);
      }
      return { type: 'object', nullable: false, children };
    }

    return { type: typeof value, nullable: false };
  }

  /**
   * Merge two schemas — union of fields, type becomes nullable if either is nullable.
   */
  private mergeSchemas(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!a || Object.keys(a).length === 0) return b;
    if (!b || Object.keys(b).length === 0) return a;

    const result: Record<string, unknown> = { ...a };

    // For object schemas, merge children
    if (a.type === 'object' && b.type === 'object') {
      const aChildren = (a.children || {}) as Record<string, Record<string, unknown>>;
      const bChildren = (b.children || {}) as Record<string, Record<string, unknown>>;
      const mergedChildren: Record<string, unknown> = { ...aChildren };

      for (const [key, bChild] of Object.entries(bChildren)) {
        if (mergedChildren[key]) {
          mergedChildren[key] = this.mergeSchemas(
            mergedChildren[key] as Record<string, unknown>,
            bChild,
          );
        } else {
          // New field — mark as nullable since it wasn't in all samples
          mergedChildren[key] = { ...bChild, nullable: true };
        }
      }

      result.children = mergedChildren;
    }

    // If types differ, mark as nullable
    if (a.type !== b.type) {
      result.nullable = true;
    }

    return result;
  }

  /**
   * Validate a response body against an inferred schema.
   */
  private validate(
    body: unknown,
    schema: Record<string, unknown>,
    path: string,
  ): SchemaViolation[] {
    const violations: SchemaViolation[] = [];

    if (schema.type === 'object' && typeof body === 'object' && body !== null) {
      const children = (schema.children || {}) as Record<string, InferredField>;
      const bodyObj = body as Record<string, unknown>;

      // Check for missing required fields
      for (const [key, fieldSchema] of Object.entries(children)) {
        const fieldPath = path ? `${path}.${key}` : key;

        if (!(key in bodyObj)) {
          if (!fieldSchema.nullable) {
            violations.push({
              field: fieldPath,
              type: 'missing_field',
              message: `Required field "${fieldPath}" is missing`,
            });
          }
          continue;
        }

        const value = bodyObj[key];

        // Check for null in non-nullable
        if (value === null && !fieldSchema.nullable) {
          violations.push({
            field: fieldPath,
            type: 'null_value',
            message: `Field "${fieldPath}" is null but was previously non-null`,
          });
          continue;
        }

        if (value !== null && value !== undefined) {
          // Check type changes
          const actualType = Array.isArray(value)
            ? 'array'
            : typeof value;

          if (fieldSchema.type !== 'null' && fieldSchema.type !== actualType) {
            violations.push({
              field: fieldPath,
              type: 'type_change',
              message: `Field "${fieldPath}" changed type from "${fieldSchema.type}" to "${actualType}"`,
            });
          }

          // Recurse into nested objects
          if (fieldSchema.type === 'object' && fieldSchema.children && typeof value === 'object') {
            const nested = this.validate(value, { type: 'object', children: fieldSchema.children }, fieldPath);
            violations.push(...nested);
          }
        }
      }

      // Check for unexpected new fields
      for (const key of Object.keys(bodyObj)) {
        if (!(key in children)) {
          const fieldPath = path ? `${path}.${key}` : key;
          violations.push({
            field: fieldPath,
            type: 'unexpected_field',
            message: `Unexpected field "${fieldPath}" not present in schema contract`,
          });
        }
      }
    }

    return violations;
  }
}
