import { Router } from 'express';
import { generateTests, debugRequest, chat, getUsage, generateSuite } from './ai.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

router.post('/generate-tests', generateTests);
router.post('/generate-suite', generateSuite);
router.post('/debug', debugRequest);
router.post('/chat', chat);
router.get('/usage', getUsage);

export default router;
