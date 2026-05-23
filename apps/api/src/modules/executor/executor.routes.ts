import { Router } from 'express';
import { executeRequest } from './executor.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

/**
 * POST /api/execute
 * Executes an HTTP request on behalf of the user (proxy to avoid CORS).
 * Requires authentication.
 */
router.post('/execute', authenticate, executeRequest);

export default router;
