import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { runCollection, stopCollection, getRunHistory, getRunById } from './collection-runner.controller';

const router = Router();

// Collection runner routes
router.post('/collections/:id/run', authenticate, runCollection);
router.post('/collections/:id/run/stop', authenticate, stopCollection);
router.get('/collections/:id/runs', authenticate, getRunHistory);

// Test run routes
router.get('/test-runs/:id', authenticate, getRunById);

export default router;
