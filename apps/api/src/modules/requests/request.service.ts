import { SavedRequest, type ISavedRequest } from '../../models/Request.model';
import { Collection } from '../../models/Collection.model';

/**
 * Request service — CRUD for saved requests within collections.
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
      headers?: ISavedRequest['headers'];
      params?: ISavedRequest['params'];
      body?: ISavedRequest['body'];
      auth?: ISavedRequest['auth'];
      testScript?: string;
      preRequestScript?: string;
    },
  ): Promise<ISavedRequest> {
    // Verify the collection belongs to this user
    const collection = await Collection.findOne({
      _id: data.collectionId,
      userId,
    });
    if (!collection) {
      throw new Error('Collection not found');
    }

    const count = await SavedRequest.countDocuments({
      collectionId: data.collectionId,
    });

    const request = new SavedRequest({
      ...data,
      userId,
      folderId: data.folderId || null,
      sortOrder: count,
    });

    return request.save();
  }

  /**
   * Get a single saved request by ID.
   */
  async getById(userId: string, requestId: string): Promise<ISavedRequest> {
    const request = await SavedRequest.findOne({ _id: requestId, userId });
    if (!request) {
      throw new Error('Request not found');
    }
    return request;
  }

  /**
   * Update a saved request.
   */
  async update(
    userId: string,
    requestId: string,
    data: Partial<
      Pick<
        ISavedRequest,
        'name' | 'method' | 'url' | 'headers' | 'params' | 'body' | 'auth' | 'folderId' | 'sortOrder' | 'testScript' | 'preRequestScript'
      >
    >,
  ): Promise<ISavedRequest> {
    const request = await SavedRequest.findOneAndUpdate(
      { _id: requestId, userId },
      { $set: data },
      { new: true },
    );
    if (!request) {
      throw new Error('Request not found');
    }
    return request;
  }

  /**
   * Delete a saved request.
   */
  async delete(userId: string, requestId: string): Promise<void> {
    const result = await SavedRequest.deleteOne({ _id: requestId, userId });
    if (result.deletedCount === 0) {
      throw new Error('Request not found');
    }
  }

  /**
   * Duplicate a saved request with " (copy)" suffix.
   */
  async duplicate(userId: string, requestId: string): Promise<ISavedRequest> {
    const original = await SavedRequest.findOne({ _id: requestId, userId });
    if (!original) {
      throw new Error('Request not found');
    }

    const duplicate = new SavedRequest({
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

    return duplicate.save();
  }

  /**
   * List all requests for a collection.
   */
  async listByCollection(
    userId: string,
    collectionId: string,
  ): Promise<ISavedRequest[]> {
    return SavedRequest.find({ collectionId, userId })
      .sort({ sortOrder: 1 })
      .lean() as unknown as ISavedRequest[];
  }
}
