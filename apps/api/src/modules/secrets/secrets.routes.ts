import { Router } from 'express';
import * as controller from './secrets.controller';

const router = Router();

router.get('/', controller.listSecrets);
router.post('/', controller.createSecret);
router.delete('/:id', controller.deleteSecret);

export default router;
