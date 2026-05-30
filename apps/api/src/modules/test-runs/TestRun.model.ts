import mongoose, { Document } from 'mongoose';

// ===== Types =====

export interface ITestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface IRequestRunResult {
  requestId: string;
  requestName: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  timing: number;
  size: number;
  testResults: ITestResult[];
  totalPassed: number;
  totalFailed: number;
  error?: string;
}

export interface ITestRun extends Document {
  userId: mongoose.Types.ObjectId;
  collectionId: mongoose.Types.ObjectId;
  collectionName: string;
  environmentId?: mongoose.Types.ObjectId;
  trigger: 'manual' | 'scheduled' | 'ci';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  results: IRequestRunResult[];
  summary: {
    totalRequests: number;
    completedRequests: number;
    totalTestsPassed: number;
    totalTestsFailed: number;
    totalDuration: number;
  };
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schema =====

const testResultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    passed: { type: Boolean, required: true },
    error: { type: String },
    duration: { type: Number, default: 0 },
  },
  { _id: false },
);

const requestRunResultSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true },
    requestName: { type: String, required: true },
    method: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: Number, default: 0 },
    statusText: { type: String, default: '' },
    timing: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
    testResults: [testResultSchema],
    totalPassed: { type: Number, default: 0 },
    totalFailed: { type: Number, default: 0 },
    error: { type: String },
  },
  { _id: false },
);

const testRunSchema = new mongoose.Schema(
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
    trigger: {
      type: String,
      enum: ['manual', 'scheduled', 'ci'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'cancelled'],
      default: 'running',
    },
    results: [requestRunResultSchema],
    summary: {
      totalRequests: { type: Number, default: 0 },
      completedRequests: { type: Number, default: 0 },
      totalTestsPassed: { type: Number, default: 0 },
      totalTestsFailed: { type: Number, default: 0 },
      totalDuration: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// ===== Indexes =====

testRunSchema.index({ userId: 1, collectionId: 1 });
testRunSchema.index({ createdAt: -1 });

// ===== Export =====

export const TestRun = mongoose.model<ITestRun>('TestRun', testRunSchema);
