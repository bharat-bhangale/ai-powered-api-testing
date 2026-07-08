import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getAvailableDates, analyzeDiff } from './api-diff.controller';

const router = Router();
router.use(authenticate);

router.get('/dates', getAvailableDates);
router.post('/analyze', analyzeDiff);

export default router;
