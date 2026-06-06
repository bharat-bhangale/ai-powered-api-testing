import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createCollection,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addFolder,
  renameFolder,
  deleteFolder,
  exportCollection,
} from './collection.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/** POST /api/collections — Create collection */
router.post('/', createCollection);

/** GET /api/collections — List user's collections */
router.get('/', listCollections);

/** GET /api/collections/:id — Get single collection with requests */
router.get('/:id', getCollection);

/** GET /api/collections/:id/export — Export collection */
router.get('/:id/export', exportCollection);

/** PATCH /api/collections/:id — Update collection */
router.patch('/:id', updateCollection);

/** DELETE /api/collections/:id — Delete collection (cascade) */
router.delete('/:id', deleteCollection);

/** POST /api/collections/:id/folders — Add folder */
router.post('/:id/folders', addFolder);

/** PATCH /api/collections/:id/folders/:fid — Rename folder */
router.patch('/:id/folders/:fid', renameFolder);

/** DELETE /api/collections/:id/folders/:fid — Delete folder */
router.delete('/:id/folders/:fid', deleteFolder);

export default router;
