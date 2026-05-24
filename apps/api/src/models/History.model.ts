import mongoose, { Document } from 'mongoose';

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    size: number;
    timing: { total: number };
  };
  collectionId?: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId;
  environmentName?: string;
  executedAt: Date;
}

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  request: {
    method: String,
    url: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
  },
  response: {
    status: Number,
    statusText: String,
    headers: mongoose.Schema.Types.Mixed,
    body: mongoose.Schema.Types.Mixed,
    size: Number,
    timing: {
      total: Number,
    },
  },
  collectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedRequest' },
  environmentName: String,
  executedAt: { type: Date, default: Date.now },
});

// Index for user's history, newest first
historySchema.index({ userId: 1, executedAt: -1 });

// TTL: auto-delete after 90 days
historySchema.index({ executedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Text-like index for URL search (use regex in service, but index for perf)
historySchema.index({ 'request.url': 1 });

export const History = mongoose.model<IHistory>('History', historySchema);
