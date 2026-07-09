import { Router } from 'express';
import { generateTests, debugRequest, chat, getUsage, generateSuite, analyzeCoverage, generateDocs, downloadDocs, nlToRequest, testBuilderMessage, performanceProfile, optimizeRequest, generateData, healthScore, getHealthHistory } from './ai.controller';
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
router.post('/health-score', healthScore);
router.get('/health-score/history', getHealthHistory);

export default router;
