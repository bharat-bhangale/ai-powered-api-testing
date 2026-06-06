import { dbProvider } from '../../data/database-provider';
import crypto from 'crypto';

/**
 * Collection service — CRUD operations for collections and folders.
 * Business logic only — no req/res access.
 * Uses the AtxDataProvider boundary for persistence.
 */
export class CollectionService {
  /**
   * Create a new collection for a user.
   */
  async create(
    userId: string,
    name: string,
    description?: string,
  ) {
    const id = crypto.randomUUID();
    const collection = await dbProvider.collections.create({
      id,
      userId,
      name,
      description,
    });
    return { ...collection, _id: collection.id, folders: [] };
  }

  /**
   * List all collections for a user with their embedded folders.
   */
  async list(userId: string) {
    const collections = await dbProvider.collections.listByUser(userId);
    
    // We fetch folders for each collection to match the legacy Mongoose shape
    return Promise.all(collections.map(async (c) => {
      const folders = await dbProvider.folders.listByCollection(c.id);
      return {
        ...c,
        _id: c.id,
        folders: folders.map(f => ({ ...f, _id: f.id })),
      };
    }));
  }

  /**
   * Get a single collection with all its requests.
   */
  async getById(
    userId: string,
    collectionId: string,
  ) {
    const collection = await dbProvider.collections.getById({ id: collectionId, userId });
    if (!collection) {
      throw new Error('Collection not found');
    }

    const folders = await dbProvider.folders.listByCollection(collectionId);
    const requests = await dbProvider.requests.listByCollection({ collectionId, userId });

    return { 
      collection: {
        ...collection,
        _id: collection.id,
        folders: folders.map(f => ({ ...f, _id: f.id })),
      }, 
      requests: requests.map(r => ({ ...r, _id: r.id }))
    };
  }

  /**
   * Update a collection (name, description, auth).
   */
  async update(
    userId: string,
    collectionId: string,
    updates: { name?: string; description?: string; auth?: any; sortOrder?: number },
  ) {
    const collection = await dbProvider.collections.update({
      id: collectionId,
      userId,
      ...updates
    });

    const folders = await dbProvider.folders.listByCollection(collectionId);

    return {
      ...collection,
      _id: collection.id,
      folders: folders.map(f => ({ ...f, _id: f.id })),
    };
  }

  /**
   * Delete a collection and cascade-delete all its saved requests.
   */
  async delete(userId: string, collectionId: string): Promise<void> {
    await dbProvider.collections.delete({ id: collectionId, userId });
  }

  /**
   * Add a folder to a collection.
   */
  async addFolder(
    userId: string,
    collectionId: string,
    folderName: string,
    parentFolderId?: string,
  ) {
    // Verify collection ownership
    const collection = await dbProvider.collections.getById({ id: collectionId, userId });
    if (!collection) throw new Error('Collection not found');

    await dbProvider.folders.create({
      id: crypto.randomUUID(),
      collectionId,
      name: folderName,
      parentFolderId,
    });

    return this.getCollectionWithFolders(userId, collectionId);
  }

  /**
   * Rename a folder in a collection.
   */
  async renameFolder(
    userId: string,
    collectionId: string,
    folderId: string,
    newName: string,
  ) {
    const collection = await dbProvider.collections.getById({ id: collectionId, userId });
    if (!collection) throw new Error('Collection not found');

    await dbProvider.folders.update({
      id: folderId,
      name: newName,
    });

    return this.getCollectionWithFolders(userId, collectionId);
  }

  /**
   * Delete a folder from a collection.
   * Moves contained requests to the collection root (folderId = null).
   */
  async deleteFolder(
    userId: string,
    collectionId: string,
    folderId: string,
  ) {
    const collection = await dbProvider.collections.getById({ id: collectionId, userId });
    if (!collection) throw new Error('Collection not found');

    await dbProvider.folders.delete(folderId);

    return this.getCollectionWithFolders(userId, collectionId);
  }

  private async getCollectionWithFolders(userId: string, collectionId: string) {
    const collection = await dbProvider.collections.getById({ id: collectionId, userId });
    if (!collection) throw new Error('Collection not found');
    const folders = await dbProvider.folders.listByCollection(collectionId);
    return {
      ...collection,
      _id: collection.id,
      folders: folders.map(f => ({ ...f, _id: f.id })),
    };
  }
}
