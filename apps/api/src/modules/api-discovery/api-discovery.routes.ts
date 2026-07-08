import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { startDiscovery, stopDiscovery } from './api-discovery.controller';

const router = Router();

router.use(authenticate);

/**
 * POST /api/discovery/start — starts SSE discovery stream
 * POST /api/discovery/stop  — stops active discovery session
 */
router.post('/start', startDiscovery);
router.post('/stop', stopDiscovery);

export default router;
