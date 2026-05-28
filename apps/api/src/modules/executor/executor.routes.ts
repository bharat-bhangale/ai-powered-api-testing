import { Router } from 'express';
import { executeRequest } from './executor.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { executeRequestSchema } from './executor.validation';

const router = Router();

/**
 * POST /api/execute
 * Executes an HTTP request on behalf of the user (proxy to avoid CORS).
 * Requires authentication.
 */
router.post('/execute', authenticate, validate(executeRequestSchema), executeRequest);

export const executorRoutes = router;
