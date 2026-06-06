import { Router } from 'express';
import { generateCode } from './code-gen.controller';

const router = Router();

router.post('/', generateCode);

export default router;
