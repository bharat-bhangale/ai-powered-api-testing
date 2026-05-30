import { Router } from 'express';
import { executeTests } from './test-runner.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { executeTestSchema } from './test-runner.validation';

const router = Router();

/**
 * POST /api/test-runner/execute
 * Executes a test script against request/response data in a sandboxed environment.
 * Requires authentication.
 */
router.post('/execute', authenticate, validate(executeTestSchema), executeTests);

export default router;
