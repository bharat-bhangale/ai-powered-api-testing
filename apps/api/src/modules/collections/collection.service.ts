import mongoose from 'mongoose';
import { Collection, type ICollection } from '../../models/Collection.model';
import { SavedRequest } from '../../models/Request.model';

/**
 * Collection service — CRUD operations for collections and folders.
 * Business logic only — no req/res access.
 */
export class CollectionService {
  /**
   * Create a new collection for a user.
   */
  async create(
    userId: string,
    name: string,
    description?: string,
  ): Promise<ICollection> {
    const count = await Collection.countDocuments({ userId });
    const collection = new Collection({
      name,
      description: description || '',
      userId,
      sortOrder: count,
    });
    return collection.save();
  }

  /**
   * List all collections for a user with their saved requests.
   */
  async list(userId: string) {
    return Collection.find({ userId }).sort({ sortOrder: 1 }).lean();
  }

  /**
   * Get a single collection with all its requests.
   */
  async getById(
    userId: string,
    collectionId: string,
  ) {
    const collection = await Collection.findOne({
      _id: collectionId,
      userId,
    });
    if (!collection) {
      throw new Error('Collection not found');
    }

    const requests = await SavedRequest.find({ collectionId })
      .sort({ sortOrder: 1 })
      .lean();

    return { collection, requests };
  }

  /**
   * Update a collection (name, description, auth).
   */
  async update(
    userId: string,
    collectionId: string,
    updates: Partial<Pick<ICollection, 'name' | 'description' | 'auth' | 'sortOrder'>>,
  ): Promise<ICollection> {
    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, userId },
      { $set: updates },
      { new: true },
    );
    if (!collection) {
      throw new Error('Collection not found');
    }
    return collection;
  }

  /**
   * Delete a collection and cascade-delete all its saved requests.
   */
  async delete(userId: string, collectionId: string): Promise<void> {
    const collection = await Collection.findOne({
      _id: collectionId,
      userId,
    });
    if (!collection) {
      throw new Error('Collection not found');
    }

    // Cascade: delete all requests in this collection
    await SavedRequest.deleteMany({ collectionId });
    await Collection.deleteOne({ _id: collectionId });
  }

  /**
   * Add a folder to a collection.
   */
  async addFolder(
    userId: string,
    collectionId: string,
    folderName: string,
    parentFolderId?: string,
  ): Promise<ICollection> {
    const collection = await Collection.findOne({
      _id: collectionId,
      userId,
    });
    if (!collection) {
      throw new Error('Collection not found');
    }

    const folderCount = collection.folders.length;
    collection.folders.push({
      _id: new mongoose.Types.ObjectId(),
      name: folderName,
      parentFolderId: parentFolderId
        ? new mongoose.Types.ObjectId(parentFolderId)
        : null,
      sortOrder: folderCount,
    });

    return collection.save();
  }

  /**
   * Rename a folder in a collection.
   */
  async renameFolder(
    userId: string,
    collectionId: string,
    folderId: string,
    newName: string,
  ): Promise<ICollection> {
    const collection = await Collection.findOneAndUpdate(
      { _id: collectionId, userId, 'folders._id': folderId },
      { $set: { 'folders.$.name': newName } },
      { new: true },
    );
    if (!collection) {
      throw new Error('Collection or folder not found');
    }
    return collection;
  }

  /**
   * Delete a folder from a collection.
   * Moves contained requests to the collection root (folderId = null).
   */
  async deleteFolder(
    userId: string,
    collectionId: string,
    folderId: string,
  ): Promise<ICollection> {
    const collection = await Collection.findOne({
      _id: collectionId,
      userId,
    });
    if (!collection) {
      throw new Error('Collection not found');
    }

    // Move requests in this folder to root
    await SavedRequest.updateMany(
      { collectionId, folderId },
      { $set: { folderId: null } },
    );

    // Remove the folder
    collection.folders = collection.folders.filter(
      (f) => f._id.toString() !== folderId,
    );

    return collection.save();
  }
}
