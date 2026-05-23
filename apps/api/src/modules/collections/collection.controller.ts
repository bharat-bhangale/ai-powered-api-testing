import type { Request, Response } from 'express';
import { CollectionService } from './collection.service';
import {
  createCollectionSchema,
  updateCollectionSchema,
  addFolderSchema,
  renameFolderSchema,
} from '../../utils/validation';

const collectionService = new CollectionService();

/** POST /api/collections */
export async function createCollection(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' } });
      return;
    }
    const { name, description } = parsed.data;
    const collection = await collectionService.create(req.userId!, name, description);
    res.status(201).json({ success: true, data: { collection } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create collection';
    res.status(400).json({ success: false, error: { code: 'COLLECTION_ERROR', message } });
  }
}

/** GET /api/collections */
export async function listCollections(req: Request, res: Response): Promise<void> {
  try {
    const collections = await collectionService.list(req.userId!);
    res.json({ success: true, data: { collections } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list collections';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/collections/:id */
export async function getCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await collectionService.getById(req.userId!, id);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Collection not found';
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
  }
}

/** PATCH /api/collections/:id */
export async function updateCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = updateCollectionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' } });
      return;
    }
    const collection = await collectionService.update(req.userId!, id, parsed.data);
    res.json({ success: true, data: { collection } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update collection';
    res.status(400).json({ success: false, error: { code: 'COLLECTION_ERROR', message } });
  }
}

/** DELETE /api/collections/:id */
export async function deleteCollection(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await collectionService.delete(req.userId!, id);
    res.json({ success: true, data: { message: 'Collection deleted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete collection';
    res.status(400).json({ success: false, error: { code: 'COLLECTION_ERROR', message } });
  }
}

/** POST /api/collections/:id/folders */
export async function addFolder(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = addFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' } });
      return;
    }
    const { name, parentFolderId } = parsed.data;
    const collection = await collectionService.addFolder(req.userId!, id, name, parentFolderId);
    res.status(201).json({ success: true, data: { collection } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add folder';
    res.status(400).json({ success: false, error: { code: 'FOLDER_ERROR', message } });
  }
}

/** PATCH /api/collections/:id/folders/:fid */
export async function renameFolder(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const fid = req.params.fid as string;
    const parsed = renameFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' } });
      return;
    }
    const { name } = parsed.data;
    const collection = await collectionService.renameFolder(req.userId!, id, fid, name);
    res.json({ success: true, data: { collection } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to rename folder';
    res.status(400).json({ success: false, error: { code: 'FOLDER_ERROR', message } });
  }
}

/** DELETE /api/collections/:id/folders/:fid */
export async function deleteFolder(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const fid = req.params.fid as string;
    const collection = await collectionService.deleteFolder(req.userId!, id, fid);
    res.json({ success: true, data: { collection } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete folder';
    res.status(400).json({ success: false, error: { code: 'FOLDER_ERROR', message } });
  }
}
