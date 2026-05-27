/**
 * Variable types — "text" for regular values, "secret" for masked/encrypted values.
 */
export type VariableType = 'text' | 'secret';
/**
 * A single environment variable.
 */
export interface EnvironmentVariable {
    key: string;
    value: string;
    type: VariableType;
    description?: string;
}
/**
 * An environment (Dev, Staging, Prod, etc.) with variables.
 */
export interface Environment {
    id: string;
    name: string;
    userId: string;
    variables: EnvironmentVariable[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}
/**
 * Payload to create a new environment.
 */
export interface CreateEnvironmentPayload {
    name: string;
    variables: EnvironmentVariable[];
}
/**
 * Payload to update an existing environment.
 */
export interface UpdateEnvironmentPayload {
    name?: string;
    variables?: EnvironmentVariable[];
}
//# sourceMappingURL=environment.types.d.ts.map