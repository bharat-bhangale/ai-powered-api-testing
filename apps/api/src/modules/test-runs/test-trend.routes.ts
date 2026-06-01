import { Router } from 'express';
import { getTrends, getHistory } from './test-trend.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/trends', getTrends);
router.get('/history', getHistory);

export default router;
