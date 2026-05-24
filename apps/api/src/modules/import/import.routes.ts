import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { importPostman } from './import.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/postman', importPostman);

export default router;
