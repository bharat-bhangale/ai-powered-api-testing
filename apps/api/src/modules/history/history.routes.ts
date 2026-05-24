import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  listHistory,
  getHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
} from './history.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', listHistory);
router.get('/:id', getHistoryEntry);
router.delete('/:id', deleteHistoryEntry);
router.delete('/', clearHistory);

export default router;
