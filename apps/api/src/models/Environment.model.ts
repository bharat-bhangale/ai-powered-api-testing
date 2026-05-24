import mongoose, { Document } from 'mongoose';

export interface IEnvironment extends Document {
  name: string;
  userId: mongoose.Types.ObjectId;
  variables: Array<{
    key: string;
    value: string;
    type: 'text' | 'secret';
    description: string;
  }>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const environmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    variables: [
      {
        key: { type: String, required: true },
        value: { type: String, default: '' },
        type: { type: String, enum: ['text', 'secret'], default: 'text' },
        description: { type: String, default: '' },
      },
    ],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

environmentSchema.index({ userId: 1 });

export const Environment = mongoose.model<IEnvironment>('Environment', environmentSchema);
