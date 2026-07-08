import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { generateMock, startMock, stopMock, getMockStatus } from './mock-server.controller';

const router = Router();
router.use(authenticate);

router.post('/generate', generateMock);
router.post('/start', startMock);
router.post('/stop', stopMock);
router.get('/status', getMockStatus);

export default router;
