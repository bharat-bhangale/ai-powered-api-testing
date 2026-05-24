import { Environment, type IEnvironment } from '../../models/Environment.model';

/**
 * Environment service — CRUD + variable resolution helpers.
 * Business logic only — no req/res access.
 */
export class EnvironmentService {
  /**
   * Create a new environment for a user.
   */
  async create(
    userId: string,
    name: string,
    variables: Array<{ key: string; value: string; type?: string; description?: string }> = [],
  ): Promise<IEnvironment> {
    const env = new Environment({ name, userId, variables });
    return env.save();
  }

  /**
   * List all environments for a user.
   * Secret variable values are masked with "••••••".
   */
  async list(userId: string): Promise<Record<string, unknown>[]> {
    const envs = await Environment.find({ userId }).sort({ name: 1 }).lean();
    return envs.map((env) => ({
      ...env,
      variables: env.variables.map((v) => ({
        ...v,
        value: v.type === 'secret' ? '••••••' : v.value,
      })),
    }));
  }

  /**
   * Get a single environment with REAL values (owner-only, for editing).
   */
  async getById(userId: string, envId: string): Promise<IEnvironment | null> {
    return Environment.findOne({ _id: envId, userId });
  }

  /**
   * Get a flat Record<key, value> of resolved variables.
   * Returns real values even for secrets (used by executor).
   */
  async getVariables(userId: string, envId: string): Promise<Record<string, string>> {
    const env = await Environment.findOne({ _id: envId, userId });
    if (!env) return {};

    const vars: Record<string, string> = {};
    env.variables.forEach((v) => {
      vars[v.key] = v.value;
    });
    return vars;
  }

  /**
   * Update an environment (name, variables).
   */
  async update(userId: string, envId: string, updates: Partial<Pick<IEnvironment, 'name' | 'variables'>>) {
    return Environment.findOneAndUpdate(
      { _id: envId, userId },
      { $set: updates },
      { new: true },
    );
  }

  /**
   * Delete an environment.
   */
  async delete(userId: string, envId: string): Promise<boolean> {
    const result = await Environment.deleteOne({ _id: envId, userId });
    return result.deletedCount > 0;
  }

  /**
   * Set an environment as the default.
   * Unsets all others for this user first.
   */
  async setDefault(userId: string, envId: string): Promise<void> {
    await Environment.updateMany({ userId }, { isDefault: false });
    await Environment.findOneAndUpdate({ _id: envId, userId }, { isDefault: true });
  }
}
