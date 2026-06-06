import { Router } from 'express';
import * as controller from './settings.controller';

const router = Router();

router.get('/', controller.listSettings);
router.get('/:key', controller.getSetting);
router.put('/:key', controller.setSetting);

export default router;
