import mongoose, { Document } from 'mongoose';

// ===== Interface =====

export interface ISavedRequest extends Document {
  name: string;
  collectionId: mongoose.Types.ObjectId;
  folderId: mongoose.Types.ObjectId | null;
  userId: mongoose.Types.ObjectId;
  method: string;
  url: string;
  headers: Array<{
    key: string;
    value: string;
    description: string;
    enabled: boolean;
  }>;
  params: Array<{
    key: string;
    value: string;
    description: string;
    enabled: boolean;
  }>;
  body: {
    mode: string;
    content: string;
    contentType: string;
  };
  auth: {
    type: string;
    config: Record<string, unknown>;
  };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schema =====

const savedRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    url: { type: String, default: '' },
    headers: [
      {
        key: String,
        value: String,
        description: { type: String, default: '' },
        enabled: { type: Boolean, default: true },
      },
    ],
    params: [
      {
        key: String,
        value: String,
        description: { type: String, default: '' },
        enabled: { type: Boolean, default: true },
      },
    ],
    body: {
      mode: { type: String, default: 'none' },
      content: { type: String, default: '' },
      contentType: { type: String, default: '' },
    },
    auth: {
      type: {
        type: String,
        enum: ['none', 'apikey', 'bearer', 'basic'],
        default: 'none',
      },
      config: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ===== Indexes =====

savedRequestSchema.index({ collectionId: 1, sortOrder: 1 });
savedRequestSchema.index({ folderId: 1 });
savedRequestSchema.index({ userId: 1 });

// ===== Export =====

export const SavedRequest = mongoose.model<ISavedRequest>(
  'SavedRequest',
  savedRequestSchema,
);
