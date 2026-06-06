import { dbProvider } from '../../data/database-provider';
import crypto from 'crypto';
import type { HttpMethod } from '@atx/shared/src/types/request.types';

/**
 * Request service — CRUD for saved requests within collections.
 * Business logic only — no req/res access.
 * Uses the AtxDataProvider boundary for persistence.
 */
export class RequestService {
  /**
   * Save a new request to a collection.
   */
  async create(
    userId: string,
    data: {
      name: string;
      collectionId: string;
      folderId?: string;
      method: string;
      url: string;
      headers?: any[];
      params?: any[];
      body?: any;
      auth?: any;
      testScript?: string;
      preRequestScript?: string;
    },
  ) {
    // Verify the collection belongs to this user
    const collection = await dbProvider.collections.getById({ id: data.collectionId, userId });
    if (!collection) {
      throw new Error('Collection not found');
    }

    const existingRequests = await dbProvider.requests.listByCollection({ collectionId: data.collectionId, userId });
    const count = existingRequests.length;

    const request = await dbProvider.requests.create({
      id: crypto.randomUUID(),
      userId,
      ...data,
      method: (data.method as HttpMethod) || 'GET',
      sortOrder: count,
    });

    return { ...request, _id: request.id };
  }

  /**
   * Get a single saved request by ID.
   */
  async getById(userId: string, requestId: string) {
    const request = await dbProvider.requests.getById({ id: requestId, userId });
    if (!request) {
      throw new Error('Request not found');
    }
    return { ...request, _id: request.id };
  }

  /**
   * Update a saved request.
   */
  async update(
    userId: string,
    requestId: string,
    data: Partial<{
      name: string;
      method: string;
      url: string;
      headers: any[];
      params: any[];
      body: any;
      auth: any;
      folderId: string;
      sortOrder: number;
      testScript: string;
      preRequestScript: string;
    }>,
  ) {
    const request = await dbProvider.requests.update({
      id: requestId,
      userId,
      ...data,
      method: data.method ? (data.method as HttpMethod) : undefined,
    });

    return { ...request, _id: request.id };
  }

  /**
   * Delete a saved request.
   */
  async delete(userId: string, requestId: string): Promise<void> {
    const request = await dbProvider.requests.getById({ id: requestId, userId });
    if (!request) {
      throw new Error('Request not found');
    }
    await dbProvider.requests.delete({ id: requestId, userId });
  }

  /**
   * Duplicate a saved request with " (copy)" suffix.
   */
  async duplicate(userId: string, requestId: string) {
    const original = await dbProvider.requests.getById({ id: requestId, userId });
    if (!original) {
      throw new Error('Request not found');
    }

    const duplicate = await dbProvider.requests.create({
      id: crypto.randomUUID(),
      name: `${original.name} (copy)`,
      collectionId: original.collectionId,
      folderId: original.folderId,
      userId,
      method: original.method,
      url: original.url,
      headers: original.headers,
      params: original.params,
      body: original.body,
      auth: original.auth,
      sortOrder: original.sortOrder + 1,
    });

    return { ...duplicate, _id: duplicate.id };
  }

  /**
   * List all requests for a collection.
   */
  async listByCollection(
    userId: string,
    collectionId: string,
  ) {
    const requests = await dbProvider.requests.listByCollection({ collectionId, userId });
    return requests.map(r => ({ ...r, _id: r.id }));
  }
}
