import { eq, asc, and } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../client';
import { requests, type RequestRow, type InsertRequestRow } from '../schema';
import type { HttpMethod, KeyValuePair, RequestBody, AuthConfig } from '@atx/shared/src/types/request.types';

// ===== Types =====

export interface RequestRecord {
  id: string;
  userId: string;
  collectionId: string;
  folderId?: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  sortOrder: number;
  testScript: string;
  preRequestScript: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestInput {
  id: string;
  userId: string;
  collectionId: string;
  folderId?: string;
  name: string;
  method?: HttpMethod;
  url?: string;
  headers?: KeyValuePair[];
  params?: KeyValuePair[];
  body?: RequestBody;
  auth?: AuthConfig;
  sortOrder?: number;
  testScript?: string;
  preRequestScript?: string;
}

export interface UpdateRequestInput {
  id: string;
  userId: string;
  name?: string;
  method?: HttpMethod;
  url?: string;
  headers?: KeyValuePair[];
  params?: KeyValuePair[];
  body?: RequestBody;
  auth?: AuthConfig;
  sortOrder?: number;
  testScript?: string;
  preRequestScript?: string;
}

export interface MoveRequestInput {
  id: string;
  userId: string;
  folderId: string | null;
  sortOrder?: number;
}

// ===== Validation =====

const KVPSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});

function parseKVP(json: string): KeyValuePair[] {
  try {
    return z.array(KVPSchema).parse(JSON.parse(json));
  } catch {
    return [];
  }
}

const AuthConfigSchema = z.object({
  type: z.enum(['none', 'apikey', 'bearer', 'basic']),
  apiKey: z.object({ key: z.string(), value: z.string(), addTo: z.enum(['header', 'query']) }).optional(),
  bearer: z.object({ token: z.string() }).optional(),
  basic: z.object({ username: z.string(), password: z.string() }).optional(),
});

function parseAuth(json: string): AuthConfig {
  try {
    return AuthConfigSchema.parse(JSON.parse(json)) as AuthConfig;
  } catch {
    return { type: 'none' };
  }
}

function rowToRecord(row: RequestRow): RequestRecord {
  return {
    id: row.id,
    userId: row.userId,
    collectionId: row.collectionId,
    folderId: row.folderId ?? undefined,
    name: row.name,
    method: row.method as HttpMethod,
    url: row.url,
    headers: parseKVP(row.headersJson),
    params: parseKVP(row.paramsJson),
    body: {
      mode: row.bodyMode as RequestBody['mode'],
      content: row.bodyContent,
      contentType: row.bodyContentType,
    },
    auth: parseAuth(row.authConfigJson),
    sortOrder: row.sortOrder,
    testScript: row.testScript,
    preRequestScript: row.preRequestScript,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const requestsRepository = {
  async listByCollection(params: { collectionId: string; userId: string }): Promise<RequestRecord[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(requests)
      .where(and(eq(requests.collectionId, params.collectionId), eq(requests.userId, params.userId)))
      .orderBy(asc(requests.sortOrder));
    return rows.map(rowToRecord);
  },

  async getById(params: { id: string; userId: string }): Promise<RequestRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(requests)
      .where(and(eq(requests.id, params.id), eq(requests.userId, params.userId)))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateRequestInput): Promise<RequestRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertRequestRow = {
      id: input.id,
      userId: input.userId,
      collectionId: input.collectionId,
      folderId: input.folderId ?? null,
      name: input.name,
      method: input.method ?? 'GET',
      url: input.url ?? '',
      headersJson: JSON.stringify(input.headers ?? []),
      paramsJson: JSON.stringify(input.params ?? []),
      bodyMode: input.body?.mode ?? 'none',
      bodyContent: input.body?.content ?? '',
      bodyContentType: input.body?.contentType ?? 'application/json',
      authType: input.auth?.type ?? 'none',
      authConfigJson: JSON.stringify(input.auth ?? { type: 'none' }),
      sortOrder: input.sortOrder ?? 0,
      testScript: input.testScript ?? '',
      preRequestScript: input.preRequestScript ?? '',
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(requests).values(row);
    const created = await this.getById({ id: input.id, userId: input.userId });
    if (!created) throw new Error('Failed to create request');
    return created;
  },

  async update(input: UpdateRequestInput): Promise<RequestRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertRequestRow> = { updatedAt: now };

    if (input.name !== undefined) patch.name = input.name;
    if (input.method !== undefined) patch.method = input.method;
    if (input.url !== undefined) patch.url = input.url;
    if (input.headers !== undefined) patch.headersJson = JSON.stringify(input.headers);
    if (input.params !== undefined) patch.paramsJson = JSON.stringify(input.params);
    if (input.body !== undefined) {
      patch.bodyMode = input.body.mode;
      patch.bodyContent = input.body.content;
      patch.bodyContentType = input.body.contentType;
    }
    if (input.auth !== undefined) {
      patch.authType = input.auth.type;
      patch.authConfigJson = JSON.stringify(input.auth);
    }
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
    if (input.testScript !== undefined) patch.testScript = input.testScript;
    if (input.preRequestScript !== undefined) patch.preRequestScript = input.preRequestScript;

    await db.update(requests).set(patch).where(and(eq(requests.id, input.id), eq(requests.userId, input.userId)));
    const updated = await this.getById({ id: input.id, userId: input.userId });
    if (!updated) throw new Error('Request not found after update');
    return updated;
  },

  async delete(params: { id: string; userId: string }): Promise<void> {
    const db = getDb();
    await db.delete(requests).where(and(eq(requests.id, params.id), eq(requests.userId, params.userId)));
  },

  async move(input: MoveRequestInput): Promise<void> {
    const db = getDb();
    const patch: Partial<InsertRequestRow> = {
      folderId: input.folderId,
      updatedAt: new Date().toISOString(),
    };
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

    await db.update(requests).set(patch).where(and(eq(requests.id, input.id), eq(requests.userId, input.userId)));
  },

  async duplicate(params: { id: string; newId: string; userId: string }): Promise<RequestRecord> {
    const original = await this.getById({ id: params.id, userId: params.userId });
    if (!original) throw new Error('Original request not found');

    const input: CreateRequestInput = {
      ...original,
      id: params.newId,
      name: `${original.name} (Copy)`,
    };
    return this.create(input);
  },
};
