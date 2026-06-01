import { Router } from 'express';
import { getDashboard } from './dashboard.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);
router.get('/', getDashboard);

export default router;
