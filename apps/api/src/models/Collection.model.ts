import mongoose, { Document } from 'mongoose';

// ===== Interface =====

export interface ICollection extends Document {
  name: string;
  description: string;
  userId: mongoose.Types.ObjectId;
  folders: Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    parentFolderId: mongoose.Types.ObjectId | null;
    sortOrder: number;
  }>;
  auth: {
    type: string;
    config: Record<string, unknown>;
  };
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schema =====

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    folders: [
      {
        name: { type: String, required: true },
        parentFolderId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        sortOrder: { type: Number, default: 0 },
      },
    ],
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

collectionSchema.index({ userId: 1, sortOrder: 1 });

// ===== Export =====

export const Collection = mongoose.model<ICollection>(
  'Collection',
  collectionSchema,
);
