import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { runFuzz } from './fuzz-testing.controller';

const router = Router();
router.use(authenticate);

router.post('/run', runFuzz);

export default router;
