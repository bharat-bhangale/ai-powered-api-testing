import { Router } from 'express';
import {
  createSchedule,
  listSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
} from './schedule.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', createSchedule);
router.get('/', listSchedules);
router.get('/:id', getSchedule);
router.put('/:id', updateSchedule);
router.delete('/:id', deleteSchedule);
router.patch('/:id/toggle', toggleSchedule);

export default router;
