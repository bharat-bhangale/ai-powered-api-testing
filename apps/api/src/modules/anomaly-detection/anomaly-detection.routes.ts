import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  analyzeResponse,
  getBaseline,
  listBaselines,
  explainAnomaly,
} from './anomaly-detection.controller';

const router = Router();
router.use(authenticate);

router.post('/analyze', analyzeResponse);
router.get('/baselines', listBaselines);
router.get('/baseline/:endpointKey', getBaseline);
router.post('/explain', explainAnomaly);

export default router;
