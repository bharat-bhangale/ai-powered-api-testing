import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionService } from '../collection.service';
import { dbProvider } from '../../../data/database-provider';

// Mock dbProvider
vi.mock('../../../data/database-provider', () => ({
  dbProvider: {
    collections: {
      create: vi.fn(),
      listByUser: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    folders: {
      create: vi.fn(),
      listByCollection: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    requests: {
      listByCollection: vi.fn(),
    }
  }
}));

describe('CollectionService', () => {
  let collectionService: CollectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    collectionService = new CollectionService();
  });

  describe('create', () => {
    it('should create a collection with correct sortOrder', async () => {
      vi.mocked(dbProvider.collections.create).mockResolvedValue({
        id: 'col-1',
        name: 'Test Collection',
        userId: 'user-1',
        description: '',
        auth: { type: 'none' },
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await collectionService.create('user-1', 'Test Collection');
      expect(result._id).toBe('col-1');
      expect(result.folders).toEqual([]);
    });
  });

  describe('list', () => {
    it('should return collections sorted by sortOrder', async () => {
      const mockCollections = [
        { id: 'col-1', name: 'First', sortOrder: 0 },
        { id: 'col-2', name: 'Second', sortOrder: 1 },
      ] as any;
      vi.mocked(dbProvider.collections.listByUser).mockResolvedValue(mockCollections);
      vi.mocked(dbProvider.folders.listByCollection).mockResolvedValue([]);

      const result = await collectionService.list('user-1');
      expect(result[0]!._id).toBe('col-1');
      expect(result[0]!.folders).toEqual([]);
      expect(dbProvider.collections.listByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getById', () => {
    it('should return collection with its requests', async () => {
      vi.mocked(dbProvider.collections.getById).mockResolvedValue({ id: 'col-1', name: 'Test' } as any);
      vi.mocked(dbProvider.folders.listByCollection).mockResolvedValue([{ id: 'folder-1', name: 'Folder' } as any]);
      vi.mocked(dbProvider.requests.listByCollection).mockResolvedValue([{ id: 'req-1', name: 'Req' } as any]);

      const result = await collectionService.getById('user-1', 'col-1');

      expect(result!.collection._id).toBe('col-1');
      expect(result!.collection.folders[0]!._id).toBe('folder-1');
      expect(result!.requests[0]!._id).toBe('req-1');
    });

    it('should throw if collection not found', async () => {
      vi.mocked(dbProvider.collections.getById).mockResolvedValue(null);

      await expect(
        collectionService.getById('user-1', 'non-existent'),
      ).rejects.toThrow('Collection not found');
    });
  });

  describe('update', () => {
    it('should update collection and return updated doc', async () => {
      vi.mocked(dbProvider.collections.update).mockResolvedValue({ id: 'col-1', name: 'Updated' } as any);
      vi.mocked(dbProvider.folders.listByCollection).mockResolvedValue([]);

      const result = await collectionService.update('user-1', 'col-1', { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should cascade-delete all requests in the collection', async () => {
      await collectionService.delete('user-1', 'col-1');
      expect(dbProvider.collections.delete).toHaveBeenCalledWith({ id: 'col-1', userId: 'user-1' });
    });
  });

  describe('deleteFolder', () => {
    it('should move contained requests to root and remove folder', async () => {
      vi.mocked(dbProvider.collections.getById).mockResolvedValue({ id: 'col-1', name: 'Test' } as any);
      vi.mocked(dbProvider.folders.listByCollection).mockResolvedValue([]);

      await collectionService.deleteFolder('user-1', 'col-1', 'folder-1');

      expect(dbProvider.folders.delete).toHaveBeenCalledWith('folder-1');
    });

    it('should throw if collection not found', async () => {
      vi.mocked(dbProvider.collections.getById).mockResolvedValue(null);

      await expect(
        collectionService.deleteFolder('user-1', 'col-1', 'folder-1'),
      ).rejects.toThrow('Collection not found');
    });
  });
});
