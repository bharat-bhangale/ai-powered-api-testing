import { Request, Response, NextFunction } from 'express';
import { CertificatesService } from './certificates.service';
import { CreateCertificateSchema, UpdateCertificateSchema } from './certificates.validation';

const certificatesService = new CertificatesService();

export const listCertificates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.headers['x-user-id'] || '');
    const certs = await certificatesService.listCertificates(userId);
    res.json(certs);
  } catch (error) {
    next(error);
  }
};

export const getCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id);
    const cert = await certificatesService.getCertificate(userId, id);
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    res.json(cert);
  } catch (error) {
    next(error);
  }
};

export const createCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.headers['x-user-id'] || '');
    const data = CreateCertificateSchema.parse(req.body);
    const cert = await certificatesService.createCertificate(userId, data);
    res.status(201).json(cert);
  } catch (error) {
    next(error);
  }
};

export const updateCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id);
    const data = UpdateCertificateSchema.parse(req.body);
    const cert = await certificatesService.updateCertificate(userId, id, data);
    res.json(cert);
  } catch (error) {
    next(error);
  }
};

export const deleteCertificate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id);
    await certificatesService.deleteCertificate(userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
