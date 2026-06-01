import mongoose, { Document } from 'mongoose';

// ===== Types =====

export interface ISchedule extends Document {
  userId: mongoose.Types.ObjectId;
  collectionId: mongoose.Types.ObjectId;
  collectionName: string;
  environmentId?: mongoose.Types.ObjectId;
  /** Standard 5-field cron expression */
  cronExpression: string;
  /** Human-readable label (e.g., "Every 5 minutes") */
  label: string;
  enabled: boolean;
  /** Webhook URL to POST failure notifications to */
  webhookUrl?: string;
  /** Email address to send failure notifications to */
  notifyEmail?: string;
  lastRunAt?: Date;
  lastRunStatus?: 'completed' | 'failed';
  lastRunId?: mongoose.Types.ObjectId;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schema =====

const scheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Collection',
      required: true,
    },
    collectionName: { type: String, required: true },
    environmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Environment',
    },
    cronExpression: { type: String, required: true },
    label: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    webhookUrl: { type: String },
    notifyEmail: { type: String },
    lastRunAt: { type: Date },
    lastRunStatus: {
      type: String,
      enum: ['completed', 'failed'],
    },
    lastRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestRun' },
    nextRunAt: { type: Date },
  },
  { timestamps: true },
);

// ===== Indexes =====

scheduleSchema.index({ userId: 1 });
scheduleSchema.index({ enabled: 1, nextRunAt: 1 });

// ===== Export =====

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
