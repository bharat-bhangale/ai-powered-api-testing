import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { exportBackup, importBackup } from './backups.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/export', exportBackup);
router.post('/import', importBackup);

export default router;
