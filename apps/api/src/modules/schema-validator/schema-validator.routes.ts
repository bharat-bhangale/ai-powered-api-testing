import { Router } from 'express';
import {
  validateResponse,
  listContracts,
  getContract,
  deleteContract,
  reInferContract,
} from './schema-validator.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/validate', validateResponse);
router.get('/contracts', listContracts);
router.get('/contract', getContract);
router.delete('/contracts/:id', deleteContract);
router.post('/re-infer', reInferContract);

export default router;
