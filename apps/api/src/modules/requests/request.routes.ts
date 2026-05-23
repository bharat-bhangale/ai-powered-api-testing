import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createRequest,
  getRequest,
  updateRequest,
  deleteRequest,
  duplicateRequest,
} from './request.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/** POST /api/requests — Save request to collection */
router.post('/', createRequest);

/** GET /api/requests/:id — Get request details */
router.get('/:id', getRequest);

/** PATCH /api/requests/:id — Update request */
router.patch('/:id', updateRequest);

/** DELETE /api/requests/:id — Delete request */
router.delete('/:id', deleteRequest);

/** POST /api/requests/:id/duplicate — Duplicate request */
router.post('/:id/duplicate', duplicateRequest);

export default router;
