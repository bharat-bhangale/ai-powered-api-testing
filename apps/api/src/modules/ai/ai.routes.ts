import { Router } from 'express';
import { generateTests, debugRequest, chat, getUsage, generateSuite, analyzeCoverage, generateDocs, downloadDocs, nlToRequest, testBuilderMessage, performanceProfile, optimizeRequest, generateData } from './ai.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

router.post('/generate-tests', generateTests);
router.post('/generate-suite', generateSuite);
router.post('/debug', debugRequest);
router.post('/chat', chat);
router.get('/usage', getUsage);
router.post('/analyze-coverage', analyzeCoverage);
router.post('/generate-docs', generateDocs);
router.post('/generate-docs/download', downloadDocs);
router.post('/nl-to-request', nlToRequest);
router.post('/test-builder/message', testBuilderMessage);
router.post('/performance-profile', performanceProfile);
router.post('/optimize-request', optimizeRequest);
router.post('/generate-data', generateData);

export default router;
