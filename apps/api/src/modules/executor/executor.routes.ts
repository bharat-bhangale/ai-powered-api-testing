import { Router } from 'express';
import { executeRequest } from './executor.controller';

const router = Router();

/**
 * POST /api/execute
 * Executes an HTTP request on behalf of the user (proxy to avoid CORS).
 */
router.post('/execute', executeRequest);

export default router;
