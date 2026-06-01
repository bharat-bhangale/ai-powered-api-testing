import mongoose, { Document } from 'mongoose';

// ===== Types =====

export interface ISchemaContract extends Document {
  userId: mongoose.Types.ObjectId;
  /** Unique key: METHOD + normalized path (e.g., "GET /api/users") */
  endpointKey: string;
  method: string;
  pathPattern: string;
  /** The inferred JSON Schema (simplified) */
  contractSchema: Record<string, unknown>;
  /** How many successful responses contributed to the schema */
  sampleCount: number;
  /** Last time the schema was updated */
  lastInferredAt: Date;
  /** Violations detected against this contract */
  violations: Array<{
    field: string;
    type: 'missing_field' | 'type_change' | 'unexpected_field' | 'null_value';
    message: string;
    detectedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schema =====

const violationSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    type: {
      type: String,
      enum: ['missing_field', 'type_change', 'unexpected_field', 'null_value'],
      required: true,
    },
    message: { type: String, required: true },
    detectedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const schemaContractSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpointKey: { type: String, required: true },
    method: { type: String, required: true },
    pathPattern: { type: String, required: true },
    contractSchema: { type: mongoose.Schema.Types.Mixed, required: true },
    sampleCount: { type: Number, default: 0 },
    lastInferredAt: { type: Date, default: Date.now },
    violations: [violationSchema],
  },
  { timestamps: true },
);

// ===== Indexes =====

schemaContractSchema.index({ userId: 1, endpointKey: 1 }, { unique: true });

// ===== Export =====

export const SchemaContract = mongoose.model<ISchemaContract>(
  'SchemaContract',
  schemaContractSchema,
);
