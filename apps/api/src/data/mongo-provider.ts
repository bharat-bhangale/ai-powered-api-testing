import { User } from '../models/User.model';
import { Collection } from '../models/Collection.model';
import { SavedRequest } from '../models/Request.model';
import { Environment } from '../models/Environment.model';
import { History } from '../models/History.model';
import { TestRun } from '../modules/test-runs/TestRun.model';
import { Schedule } from '../modules/schedules/Schedule.model';
import { SchemaContract } from '../modules/schema-validator/SchemaContract.model';
import mongoose from 'mongoose';
import type { AtxDataProvider } from './database-provider';
import type { 
  UserRecord, CreateUserInput, UpdateUserInput, SettingRecord, SetSettingInput,
  CollectionRecord, CreateCollectionInput, UpdateCollectionInput, ReorderCollectionInput,
  CollectionFolderRecord, CreateFolderInput, UpdateFolderInput, ReorderFolderInput,
  RequestRecord, CreateRequestInput, UpdateRequestInput, MoveRequestInput,
  EnvironmentRecord, CreateEnvironmentInput, UpdateEnvironmentInput,
  HistoryRecord, RecordHistoryInput, SearchHistoryInput,
  TestRunRecord, CreateTestRunInput, UpdateTestRunInput,
  ScheduleRecord, CreateScheduleInput, UpdateScheduleInput,
  SchemaContractRecord, CreateSchemaContractInput, UpdateSchemaContractInput
} from '@atx/db';
import type { HttpMethod, AuthConfig } from '@atx/shared/src/types/request.types';

function mapRequestToRecord(r: any): RequestRecord {
  return {
    id: r._id.toString(),
    userId: r.userId.toString(),
    collectionId: r.collectionId.toString(),
    folderId: r.folderId?.toString() || undefined,
    name: r.name,
    method: (r.method as HttpMethod) || 'GET',
    url: r.url,
    headers: r.headers || [],
    params: r.params || [],
    body: r.body,
    auth: r.auth as AuthConfig || { type: 'none' },
    sortOrder: r.sortOrder,
    testScript: r.testScript || '',
    preRequestScript: r.preRequestScript || '',
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapEnvironmentToRecord(e: any): EnvironmentRecord {
  return {
    id: e._id.toString(),
    userId: e.userId.toString(),
    name: e.name,
    variables: e.variables || [],
    isDefault: e.isDefault || false,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function mapHistoryToRecord(h: any): HistoryRecord {
  return {
    id: h._id.toString(),
    userId: h.userId.toString(),
    collectionId: h.collectionId?.toString(),
    requestId: h.requestId?.toString(),
    environmentName: h.environmentName,
    request: h.request,
    response: h.response,
    executedAt: h.executedAt.toISOString(),
    createdAt: h._id.getTimestamp().toISOString(),
  };
}

function mapTestRunToRecord(tr: any): TestRunRecord {
  return {
    id: tr._id.toString(),
    userId: tr.userId.toString(),
    collectionId: tr.collectionId.toString(),
    collectionName: tr.collectionName,
    environmentId: tr.environmentId?.toString(),
    trigger: tr.trigger,
    status: tr.status,
    results: tr.results || [],
    totalRequests: tr.summary?.totalRequests || 0,
    completedRequests: tr.summary?.completedRequests || 0,
    totalTestsPassed: tr.summary?.totalTestsPassed || 0,
    totalTestsFailed: tr.summary?.totalTestsFailed || 0,
    totalDuration: tr.summary?.totalDuration || 0,
    startedAt: tr.startedAt.toISOString(),
    completedAt: tr.completedAt?.toISOString(),
    createdAt: tr.createdAt.toISOString(),
    updatedAt: tr.updatedAt.toISOString(),
  };
}

function mapScheduleToRecord(s: any): ScheduleRecord {
  return {
    id: s._id.toString(),
    userId: s.userId.toString(),
    collectionId: s.collectionId.toString(),
    collectionName: s.collectionName,
    environmentId: s.environmentId?.toString(),
    cronExpression: s.cronExpression,
    label: s.label,
    enabled: s.enabled,
    webhookUrl: s.webhookUrl,
    notifyEmail: s.notifyEmail,
    notifyDesktop: true, // MongoDB implementation didn't have this, default to true
    lastRunAt: s.lastRunAt?.toISOString(),
    lastRunStatus: s.lastRunStatus,
    lastRunId: s.lastRunId?.toString(),
    nextRunAt: s.nextRunAt?.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapSchemaContractToRecord(sc: any): SchemaContractRecord {
  return {
    id: sc._id.toString(),
    userId: sc.userId.toString(),
    endpointKey: sc.endpointKey,
    method: sc.method,
    pathPattern: sc.pathPattern,
    contractSchema: sc.contractSchema,
    sampleCount: sc.sampleCount,
    violations: sc.violations || [],
    lastInferredAt: sc.lastInferredAt.toISOString(),
    createdAt: sc.createdAt.toISOString(),
    updatedAt: sc.updatedAt.toISOString(),
  };
}

export const mongoProvider: AtxDataProvider = {
  users: {
    getById: async (id: string): Promise<UserRecord | null> => {
      const u = await User.findById(id);
      if (!u) return null;
      return {
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        avatar: u.avatar ?? null,
        theme: u.preferences?.theme ?? 'dark',
        editorFontSize: u.preferences?.editorFontSize ?? 14,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    },
    getByEmail: async (email: string): Promise<UserRecord | null> => {
      const u = await User.findOne({ email: email.toLowerCase() });
      if (!u) return null;
      return {
        id: u._id.toString(),
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        avatar: u.avatar ?? null,
        theme: u.preferences?.theme ?? 'dark',
        editorFontSize: u.preferences?.editorFontSize ?? 14,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    },
    create: async (input: CreateUserInput): Promise<UserRecord> => {
      const u = new User({
        _id: input.id,
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash,
        avatar: input.avatar,
        preferences: { theme: input.theme ?? 'dark', editorFontSize: input.editorFontSize ?? 14 },
      });
      await u.save();
      return (await mongoProvider.users.getById(u._id.toString())) as UserRecord;
    },
    update: async (input: UpdateUserInput): Promise<UserRecord> => {
      const u = await User.findById(input.id);
      if (!u) throw new Error('User not found');
      if (input.name !== undefined) u.name = input.name;
      if (input.avatar !== undefined) u.avatar = input.avatar;
      if (input.passwordHash !== undefined) u.passwordHash = input.passwordHash;
      if (input.theme !== undefined || input.editorFontSize !== undefined) {
        u.preferences = u.preferences || {};
        if (input.theme !== undefined) u.preferences.theme = input.theme as any;
        if (input.editorFontSize !== undefined) u.preferences.editorFontSize = input.editorFontSize;
      }
      await u.save();
      return (await mongoProvider.users.getById(u._id.toString())) as UserRecord;
    },
  },

  settings: {
    getAll: async (): Promise<Record<string, unknown>> => ({}),
    getByKey: async (key: string): Promise<SettingRecord> => ({ key, value: null, updatedAt: new Date().toISOString() }),
    set: async (input: SetSettingInput): Promise<SettingRecord> => ({ key: input.key, value: input.value, updatedAt: new Date().toISOString() }),
    reset: async (key: string): Promise<SettingRecord> => ({ key, value: null, updatedAt: new Date().toISOString() }),
  },

  collections: {
    listByUser: async (userId: string): Promise<CollectionRecord[]> => {
      const collections = await Collection.find({ userId }).sort({ sortOrder: 1 });
      return collections.map(c => ({
        id: c._id.toString(),
        userId: c.userId.toString(),
        name: c.name,
        description: c.description || '',
        auth: (c.auth as AuthConfig) || { type: 'none' },
        sortOrder: c.sortOrder,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      }));
    },
    getById: async ({ id, userId }): Promise<CollectionRecord | null> => {
      const c = await Collection.findOne({ _id: id, userId });
      if (!c) return null;
      return {
        id: c._id.toString(),
        userId: c.userId.toString(),
        name: c.name,
        description: c.description || '',
        auth: (c.auth as AuthConfig) || { type: 'none' },
        sortOrder: c.sortOrder,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      };
    },
    create: async (input: CreateCollectionInput): Promise<CollectionRecord> => {
      const count = await Collection.countDocuments({ userId: input.userId });
      const c = new Collection({
        _id: input.id,
        userId: input.userId,
        name: input.name,
        description: input.description || '',
        auth: input.auth || { type: 'none' },
        sortOrder: input.sortOrder ?? count
      });
      await c.save();
      return (await mongoProvider.collections.getById({ id: c._id.toString(), userId: input.userId })) as CollectionRecord;
    },
    update: async (input: UpdateCollectionInput): Promise<CollectionRecord> => {
      const updatePayload: any = {};
      if (input.name !== undefined) updatePayload.name = input.name;
      if (input.description !== undefined) updatePayload.description = input.description;
      if (input.auth !== undefined) updatePayload.auth = input.auth;
      if (input.sortOrder !== undefined) updatePayload.sortOrder = input.sortOrder;
      
      const c = await Collection.findOneAndUpdate(
        { _id: input.id, userId: input.userId },
        { $set: updatePayload },
        { new: true }
      );
      if (!c) throw new Error('Collection not found');
      return (await mongoProvider.collections.getById({ id: c._id.toString(), userId: input.userId })) as CollectionRecord;
    },
    delete: async ({ id, userId }): Promise<void> => {
      await SavedRequest.deleteMany({ collectionId: id, userId });
      await Collection.deleteOne({ _id: id, userId });
    },
    reorder: async (input: ReorderCollectionInput): Promise<void> => {
      await Collection.updateOne({ _id: input.id, userId: input.userId }, { $set: { sortOrder: input.sortOrder } });
    }
  },

  folders: {
    listByCollection: async (collectionId: string): Promise<CollectionFolderRecord[]> => {
      const c = await Collection.findById(collectionId);
      if (!c) return [];
      return c.folders.map((f: any) => ({
        id: f._id.toString(),
        collectionId,
        parentFolderId: f.parentFolderId?.toString(),
        name: f.name,
        sortOrder: f.sortOrder,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      }));
    },
    getById: async (id: string): Promise<CollectionFolderRecord | null> => {
      const c = await Collection.findOne({ 'folders._id': id });
      if (!c) return null;
      const f = c.folders.find((f: any) => f._id.toString() === id);
      if (!f) return null;
      return {
        id: f._id.toString(),
        collectionId: c._id.toString(),
        parentFolderId: f.parentFolderId?.toString(),
        name: f.name,
        sortOrder: f.sortOrder,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      };
    },
    create: async (input: CreateFolderInput): Promise<CollectionFolderRecord> => {
      const c = await Collection.findById(input.collectionId);
      if (!c) throw new Error('Collection not found');
      const sortOrder = input.sortOrder ?? c.folders.length;
      c.folders.push({
        _id: input.id as any,
        name: input.name,
        parentFolderId: input.parentFolderId ? new mongoose.Types.ObjectId(input.parentFolderId) : null,
        sortOrder
      });
      await c.save();
      return (await mongoProvider.folders.getById(input.id)) as CollectionFolderRecord;
    },
    update: async (input: UpdateFolderInput): Promise<CollectionFolderRecord> => {
      const c = await Collection.findOne({ 'folders._id': input.id });
      if (!c) throw new Error('Folder not found');
      const f = c.folders.find((f: any) => f._id.toString() === input.id);
      if (!f) throw new Error('Folder not found in collection');
      if (input.name !== undefined) f.name = input.name;
      if (input.parentFolderId !== undefined) f.parentFolderId = input.parentFolderId ? new mongoose.Types.ObjectId(input.parentFolderId) : null;
      if (input.sortOrder !== undefined) f.sortOrder = input.sortOrder;
      await c.save();
      return (await mongoProvider.folders.getById(input.id)) as CollectionFolderRecord;
    },
    delete: async (id: string): Promise<void> => {
      const c = await Collection.findOne({ 'folders._id': id });
      if (!c) return;
      await SavedRequest.updateMany({ folderId: id }, { $set: { folderId: null } });
      await Collection.updateOne({ _id: c._id }, { $pull: { folders: { _id: id } } });
    },
    reorder: async (input: ReorderFolderInput): Promise<void> => {
      const c = await Collection.findOne({ 'folders._id': input.id });
      if (!c) return;
      const f = c.folders.find((f: any) => f._id.toString() === input.id);
      if (f) {
        f.sortOrder = input.sortOrder;
        await c.save();
      }
    }
  },

  requests: {
    listByCollection: async (params: { collectionId: string; userId: string }): Promise<RequestRecord[]> => {
      const requests = await SavedRequest.find({ collectionId: params.collectionId, userId: params.userId }).sort({ sortOrder: 1 });
      return requests.map(mapRequestToRecord);
    },
    getById: async ({ id, userId }): Promise<RequestRecord | null> => {
      const r = await SavedRequest.findOne({ _id: id, userId });
      return r ? mapRequestToRecord(r) : null;
    },
    create: async (input: CreateRequestInput): Promise<RequestRecord> => {
      const r = new SavedRequest({
        _id: input.id,
        userId: input.userId,
        collectionId: input.collectionId,
        folderId: input.folderId,
        name: input.name,
        method: input.method || 'GET',
        url: input.url || '',
        headers: input.headers || [],
        params: input.params || [],
        body: input.body,
        auth: input.auth || { type: 'none' },
        sortOrder: input.sortOrder ?? 0,
        testScript: input.testScript || '',
        preRequestScript: input.preRequestScript || ''
      });
      await r.save();
      return (await mongoProvider.requests.getById({ id: r._id.toString(), userId: input.userId })) as RequestRecord;
    },
    update: async (input: UpdateRequestInput): Promise<RequestRecord> => {
      const updatePayload: any = {};
      Object.keys(input).forEach(k => {
        if (k !== 'id' && k !== 'userId' && input[k as keyof typeof input] !== undefined) {
          updatePayload[k] = input[k as keyof typeof input];
        }
      });
      const r = await SavedRequest.findOneAndUpdate({ _id: input.id, userId: input.userId }, { $set: updatePayload }, { new: true });
      if (!r) throw new Error('Request not found');
      return (await mongoProvider.requests.getById({ id: r._id.toString(), userId: input.userId })) as RequestRecord;
    },
    delete: async ({ id, userId }): Promise<void> => {
      await SavedRequest.deleteOne({ _id: id, userId });
    },
    move: async (input: MoveRequestInput): Promise<void> => {
      await SavedRequest.updateOne({ _id: input.id, userId: input.userId }, { $set: { folderId: input.folderId, sortOrder: input.sortOrder } });
    },
    duplicate: async (params: { id: string; newId: string; userId: string }): Promise<RequestRecord> => {
      const original = await SavedRequest.findOne({ _id: params.id, userId: params.userId });
      if (!original) throw new Error('Request not found');
      
      const r = new SavedRequest({
        _id: params.newId,
        userId: original.userId,
        collectionId: original.collectionId,
        folderId: original.folderId,
        name: `${original.name} (copy)`,
        method: original.method,
        url: original.url,
        headers: original.headers,
        params: original.params,
        body: original.body,
        auth: original.auth,
        sortOrder: original.sortOrder + 1,
        testScript: original.testScript,
        preRequestScript: original.preRequestScript
      });
      await r.save();
      return mapRequestToRecord(r);
    }
  },

  environments: {
    listByUser: async (userId: string): Promise<EnvironmentRecord[]> => {
      const envs = await Environment.find({ userId }).sort({ name: 1 });
      return envs.map(mapEnvironmentToRecord);
    },
    getById: async ({ id, userId }): Promise<EnvironmentRecord | null> => {
      const e = await Environment.findOne({ _id: id, userId });
      return e ? mapEnvironmentToRecord(e) : null;
    },
    create: async (input: CreateEnvironmentInput): Promise<EnvironmentRecord> => {
      if (input.isDefault) {
        await Environment.updateMany({ userId: input.userId }, { $set: { isDefault: false } });
      }
      const e = new Environment({
        _id: input.id,
        userId: input.userId,
        name: input.name,
        variables: input.variables || [],
        isDefault: input.isDefault || false
      });
      await e.save();
      return (await mongoProvider.environments.getById({ id: e._id.toString(), userId: input.userId })) as EnvironmentRecord;
    },
    update: async (input: UpdateEnvironmentInput): Promise<EnvironmentRecord> => {
      if (input.isDefault) {
        await Environment.updateMany({ userId: input.userId }, { $set: { isDefault: false } });
      }
      const payload: any = {};
      if (input.name !== undefined) payload.name = input.name;
      if (input.variables !== undefined) payload.variables = input.variables;
      if (input.isDefault !== undefined) payload.isDefault = input.isDefault;
      
      const e = await Environment.findOneAndUpdate({ _id: input.id, userId: input.userId }, { $set: payload }, { new: true });
      if (!e) throw new Error('Environment not found');
      return (await mongoProvider.environments.getById({ id: e._id.toString(), userId: input.userId })) as EnvironmentRecord;
    },
    delete: async ({ id, userId }): Promise<void> => {
      await Environment.deleteOne({ _id: id, userId });
    },
    setDefault: async ({ id, userId }): Promise<void> => {
      await Environment.updateMany({ userId }, { $set: { isDefault: false } });
      await Environment.updateOne({ _id: id, userId }, { $set: { isDefault: true } });
    }
  },

  history: {
    search: async (input: SearchHistoryInput): Promise<HistoryRecord[]> => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const entries = await History.find({ userId: input.userId })
        .sort({ executedAt: -1 })
        .skip(offset)
        .limit(limit);
      return entries.map(mapHistoryToRecord);
    },
    record: async (input: RecordHistoryInput): Promise<HistoryRecord> => {
      const h = new History({
        _id: input.id,
        userId: input.userId,
        collectionId: input.collectionId,
        requestId: input.requestId,
        environmentName: input.environmentName,
        request: input.request,
        response: input.response,
        executedAt: input.executedAt
      });
      await h.save();
      return mapHistoryToRecord(h);
    },
    getById: async ({ id, userId }): Promise<HistoryRecord | null> => {
      const h = await History.findOne({ _id: id, userId });
      return h ? mapHistoryToRecord(h) : null;
    },
    delete: async ({ id, userId }): Promise<void> => {
      await History.deleteOne({ _id: id, userId });
    },
    clearByUser: async (userId: string): Promise<void> => {
      await History.deleteMany({ userId });
    },
    deleteOlderThan: async ({ userId, cutoffIsoString }): Promise<void> => {
      await History.deleteMany({ userId, executedAt: { $lt: new Date(cutoffIsoString) } });
    }
  },

  testRuns: {
    listByUser: async (params: { userId: string; limit?: number }): Promise<TestRunRecord[]> => {
      const runs = await TestRun.find({ userId: params.userId })
        .sort({ createdAt: -1 })
        .limit(params.limit ?? 50)
        .lean();
      return runs.map(mapTestRunToRecord);
    },
    getById: async (params: { id: string; userId: string }): Promise<TestRunRecord | null> => {
      const run = await TestRun.findOne({ _id: params.id, userId: params.userId }).lean();
      return run ? mapTestRunToRecord(run) : null;
    },
    create: async (input: CreateTestRunInput): Promise<TestRunRecord> => {
      const run = new TestRun({
        _id: input.id,
        userId: input.userId,
        collectionId: input.collectionId,
        collectionName: input.collectionName,
        environmentId: input.environmentId,
        trigger: input.trigger,
        status: 'running',
        results: [],
        summary: {
          totalRequests: 0,
          completedRequests: 0,
          totalTestsPassed: 0,
          totalTestsFailed: 0,
          totalDuration: 0,
        },
        startedAt: new Date(),
      });
      await run.save();
      return mapTestRunToRecord(run);
    },
    update: async (input: UpdateTestRunInput): Promise<TestRunRecord> => {
      const patch: any = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.results !== undefined) patch.results = input.results;
      if (input.totalRequests !== undefined) patch['summary.totalRequests'] = input.totalRequests;
      if (input.completedRequests !== undefined) patch['summary.completedRequests'] = input.completedRequests;
      if (input.totalTestsPassed !== undefined) patch['summary.totalTestsPassed'] = input.totalTestsPassed;
      if (input.totalTestsFailed !== undefined) patch['summary.totalTestsFailed'] = input.totalTestsFailed;
      if (input.totalDuration !== undefined) patch['summary.totalDuration'] = input.totalDuration;
      if (input.completedAt !== undefined) patch.completedAt = new Date(input.completedAt);

      const run = await TestRun.findOneAndUpdate(
        { _id: input.id, userId: input.userId },
        { $set: patch },
        { new: true }
      ).lean();
      if (!run) throw new Error('Test run not found');
      return mapTestRunToRecord(run);
    },
    delete: async (params: { id: string; userId: string }): Promise<void> => {
      await TestRun.deleteOne({ _id: params.id, userId: params.userId });
    },
  },
  schedules: {
    listByUser: async (userId: string): Promise<ScheduleRecord[]> => {
      const scheds = await Schedule.find({ userId }).lean();
      return scheds.map(mapScheduleToRecord);
    },
    listDue: async (): Promise<ScheduleRecord[]> => {
      const scheds = await Schedule.find({
        enabled: true,
        nextRunAt: { $lte: new Date() },
      }).lean();
      return scheds.map(mapScheduleToRecord);
    },
    getById: async (params: { id: string; userId: string }): Promise<ScheduleRecord | null> => {
      const sched = await Schedule.findOne({ _id: params.id, userId: params.userId }).lean();
      return sched ? mapScheduleToRecord(sched) : null;
    },
    create: async (input: CreateScheduleInput): Promise<ScheduleRecord> => {
      const sched = new Schedule({
        _id: input.id,
        userId: input.userId,
        collectionId: input.collectionId,
        collectionName: input.collectionName,
        environmentId: input.environmentId,
        cronExpression: input.cronExpression,
        label: input.label,
        enabled: input.enabled ?? true,
        webhookUrl: input.webhookUrl,
        notifyEmail: input.notifyEmail,
        nextRunAt: input.nextRunAt ? new Date(input.nextRunAt) : undefined,
      });
      await sched.save();
      return mapScheduleToRecord(sched);
    },
    update: async (input: UpdateScheduleInput): Promise<ScheduleRecord> => {
      const patch: any = {};
      if (input.collectionName !== undefined) patch.collectionName = input.collectionName;
      if (input.environmentId !== undefined) patch.environmentId = input.environmentId;
      if (input.cronExpression !== undefined) patch.cronExpression = input.cronExpression;
      if (input.label !== undefined) patch.label = input.label;
      if (input.enabled !== undefined) patch.enabled = input.enabled;
      if (input.webhookUrl !== undefined) patch.webhookUrl = input.webhookUrl;
      if (input.notifyEmail !== undefined) patch.notifyEmail = input.notifyEmail;
      if (input.lastRunAt !== undefined) patch.lastRunAt = new Date(input.lastRunAt);
      if (input.lastRunStatus !== undefined) patch.lastRunStatus = input.lastRunStatus;
      if (input.lastRunId !== undefined) patch.lastRunId = input.lastRunId;
      if (input.nextRunAt !== undefined) patch.nextRunAt = new Date(input.nextRunAt);

      const sched = await Schedule.findOneAndUpdate(
        { _id: input.id, userId: input.userId },
        { $set: patch },
        { new: true }
      ).lean();
      if (!sched) throw new Error('Schedule not found');
      return mapScheduleToRecord(sched);
    },
    delete: async (params: { id: string; userId: string }): Promise<void> => {
      await Schedule.deleteOne({ _id: params.id, userId: params.userId });
    },
  },
  schemaContracts: {
    listByUser: async (userId: string): Promise<SchemaContractRecord[]> => {
      const contracts = await SchemaContract.find({ userId }).lean();
      return contracts.map(mapSchemaContractToRecord);
    },
    getById: async (params: { id: string; userId: string }): Promise<SchemaContractRecord | null> => {
      const contract = await SchemaContract.findOne({ _id: params.id, userId: params.userId }).lean();
      return contract ? mapSchemaContractToRecord(contract) : null;
    },
    getByEndpointKey: async (params: { endpointKey: string; userId: string }): Promise<SchemaContractRecord | null> => {
      const contract = await SchemaContract.findOne({ endpointKey: params.endpointKey, userId: params.userId }).lean();
      return contract ? mapSchemaContractToRecord(contract) : null;
    },
    create: async (input: CreateSchemaContractInput): Promise<SchemaContractRecord> => {
      const contract = new SchemaContract({
        _id: input.id,
        userId: input.userId,
        endpointKey: input.endpointKey,
        method: input.method,
        pathPattern: input.pathPattern,
        contractSchema: input.contractSchema,
        sampleCount: input.sampleCount ?? 0,
        violations: [],
        lastInferredAt: new Date(input.lastInferredAt),
      });
      await contract.save();
      return mapSchemaContractToRecord(contract);
    },
    update: async (input: UpdateSchemaContractInput): Promise<SchemaContractRecord> => {
      const patch: any = {};
      if (input.contractSchema !== undefined) patch.contractSchema = input.contractSchema;
      if (input.sampleCount !== undefined) patch.sampleCount = input.sampleCount;
      if (input.violations !== undefined) patch.violations = input.violations;
      if (input.lastInferredAt !== undefined) patch.lastInferredAt = new Date(input.lastInferredAt);

      const contract = await SchemaContract.findOneAndUpdate(
        { _id: input.id, userId: input.userId },
        { $set: patch },
        { new: true }
      ).lean();
      if (!contract) throw new Error('Schema contract not found');
      return mapSchemaContractToRecord(contract);
    },
    delete: async (params: { id: string; userId: string }): Promise<void> => {
      await SchemaContract.deleteOne({ _id: params.id, userId: params.userId });
    },
  },
  secretReferences: {} as any,
  certificates: {} as any,
  backups: {} as any,
};
