import { Router } from 'express';
import { runMatrix } from './environment-matrix.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/run', runMatrix);

export default router;
