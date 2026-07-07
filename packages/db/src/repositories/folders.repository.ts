import { eq, asc } from 'drizzle-orm';
import { getDb } from '../client';
import { collectionFolders, type CollectionFolderRow, type InsertCollectionFolderRow } from '../schema';

// ===== Types =====

export interface CollectionFolderRecord {
  id: string;
  collectionId: string;
  parentFolderId?: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderInput {
  id: string;
  collectionId: string;
  parentFolderId?: string;
  name: string;
  sortOrder?: number;
}

export interface UpdateFolderInput {
  id: string;
  name?: string;
  parentFolderId?: string;
  sortOrder?: number;
}

export interface ReorderFolderInput {
  id: string;
  sortOrder: number;
}

// ===== Map Row =====

function rowToRecord(row: CollectionFolderRow): CollectionFolderRecord {
  return {
    id: row.id,
    collectionId: row.collectionId,
    parentFolderId: row.parentFolderId ?? undefined,
    name: row.name,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ===== Repository =====

export const foldersRepository = {
  async listByCollection(collectionId: string): Promise<CollectionFolderRecord[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(collectionFolders)
      .where(eq(collectionFolders.collectionId, collectionId))
      .orderBy(asc(collectionFolders.sortOrder));
    return rows.map(rowToRecord);
  },

  async getById(id: string): Promise<CollectionFolderRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(collectionFolders)
      .where(eq(collectionFolders.id, id))
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  },

  async create(input: CreateFolderInput): Promise<CollectionFolderRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const row: InsertCollectionFolderRow = {
      id: input.id,
      collectionId: input.collectionId,
      parentFolderId: input.parentFolderId ?? null,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(collectionFolders).values(row);
    const created = await this.getById(input.id);
    if (!created) throw new Error('Failed to create folder');
    return created;
  },

  async update(input: UpdateFolderInput): Promise<CollectionFolderRecord> {
    const db = getDb();
    const now = new Date().toISOString();
    const patch: Partial<InsertCollectionFolderRow> = { updatedAt: now };
    
    if (input.name !== undefined) patch.name = input.name;
    if (input.parentFolderId !== undefined) patch.parentFolderId = input.parentFolderId;
    if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

    await db.update(collectionFolders).set(patch).where(eq(collectionFolders.id, input.id));
    const updated = await this.getById(input.id);
    if (!updated) throw new Error('Folder not found after update');
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.delete(collectionFolders).where(eq(collectionFolders.id, id));
  },

  async reorder(input: ReorderFolderInput): Promise<void> {
    const db = getDb();
    await db
      .update(collectionFolders)
      .set({ sortOrder: input.sortOrder, updatedAt: new Date().toISOString() })
      .where(eq(collectionFolders.id, input.id));
  },
};
