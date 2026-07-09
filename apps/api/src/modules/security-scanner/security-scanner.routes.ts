import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { startScan, getReports, getReport } from './security-scanner.controller';

const router = Router();
router.use(authenticate);

router.post('/scan', startScan);
router.get('/reports', getReports);
router.get('/reports/:id', getReport);

export default router;
