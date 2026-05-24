import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createEnvironment,
  listEnvironments,
  getEnvironment,
  updateEnvironment,
  deleteEnvironment,
  setDefaultEnvironment,
} from './environment.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post('/', createEnvironment);
router.get('/', listEnvironments);
router.get('/:id', getEnvironment);
router.patch('/:id', updateEnvironment);
router.delete('/:id', deleteEnvironment);
router.patch('/:id/default', setDefaultEnvironment);

export default router;
