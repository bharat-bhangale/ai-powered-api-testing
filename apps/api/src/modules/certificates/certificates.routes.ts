import { Router } from 'express';
import {
  listCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  deleteCertificate,
} from './certificates.controller';

const router = Router();

router.get('/', listCertificates);
router.get('/:id', getCertificate);
router.post('/', createCertificate);
router.patch('/:id', updateCertificate);
router.delete('/:id', deleteCertificate);

export default router;
