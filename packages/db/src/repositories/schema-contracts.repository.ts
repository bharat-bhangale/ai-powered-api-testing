import { eq, and } from 'drizzle-orm';
import { getDb } from '../client';
import { schemaContracts, type SchemaContractRow, type InsertSchemaContractRow } from '../schema';

// ===== Types =====

export interface SchemaViolationRecord {
  field: string;
  type: 'missing_field' | 'type_change' | 'unexpected_field' | 'null_value';
  message: string;
  detectedAt: string;
}

export interface SchemaContractRecord {
  id: string;
  userId: string;
  endpointKey: string;
  method: string;
  pathPattern: string;
  contractSchema: Record<string, unknown>;
  sampleCount: number;
  violations: SchemaViolationRecord[];
  lastInferredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchemaContractInput {
  id: string;
  userId: string;
  endpointKey: string;
  method: string;
  pathPattern: string;
  contractSchema: Record<string, unknown>;
  sampleCount?: number;
  lastInferredAt: string;
}

export interface UpdateSchemaContractInput {
  id: string;
  userId: string;
  contractSchema?: Record<string, unknown>;
  sampleCount?: number;
  violations?: SchemaViolationRecord[];
  lastInferredAt?: string;
}

// ===== Map Row =====

function rowToRecord(row: SchemaContractRow): SchemaContractRecord {
  return {
    id: row.id,
    userId: row.userId,
    endpointKey: row.endpointKey,
    method: row.method,
    pathPattern: row.pathPattern,
    contractSchema: JSON.parse(row.contractSchemaJson),
    sampleCount: row.sampleCount,
    violations: JSON.parse(row.violationsJson),
    lastInferredAt: row.lastInferredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const schemaContractsRepository = {
  async listByUser(userId: string): Promise<SchemaContractRecord[]> {
    const db = getDb();
    const rows = await db.select().from(schemaContracts).where(eq(schemaContracts.userId, userId));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<SchemaContractRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(schemaContracts)
      .where(and(eq(schemaContracts.id, params.id), eq(schemaContracts.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async getByEndpointKey(params: { endpointKey: string; userId: string }): Promise<SchemaContractRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(schemaContracts)
      .where(and(eq(schemaContracts.endpointKey, params.endpointKey), eq(schemaContracts.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateSchemaContractInput): Promise<SchemaContractRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertSchemaContractRow = {
      id: input.id,
      userId: input.userId,
      endpointKey: input.endpointKey,
      method: input.method,
      pathPattern: input.pathPattern,
      contractSchemaJson: JSON.stringify(input.contractSchema),
      sampleCount: input.sampleCount ?? 0,
      violationsJson: '[]',
      lastInferredAt: input.lastInferredAt,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(schemaContracts).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create schema contract');
    return created;
  },

  async update(input: UpdateSchemaContractInput): Promise<SchemaContractRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertSchemaContractRow> = { updatedAt: now };

    if (input.contractSchema !== undefined) patch.contractSchemaJson = JSON.stringify(input.contractSchema);
    if (input.sampleCount !== undefined) patch.sampleCount = input.sampleCount;
    if (input.violations !== undefined) patch.violationsJson = JSON.stringify(input.violations);
    if (input.lastInferredAt !== undefined) patch.lastInferredAt = input.lastInferredAt;

    await db.update(schemaContracts).set(patch).where(and(eq(schemaContracts.id, input.id), eq(schemaContracts.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Schema contract not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(schemaContracts).where(and(eq(schemaContracts.id, params.id), eq(schemaContracts.userId, params.userId)));
  },
};
