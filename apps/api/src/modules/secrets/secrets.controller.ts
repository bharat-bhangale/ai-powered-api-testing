import { Request, Response, NextFunction } from 'express';
import { SecretsService } from './secrets.service';
import { CreateSecretSchema } from './secrets.validation';

const secretsService = new SecretsService();

export const listSecrets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || 'local-user';
    const secrets = await secretsService.listSecrets(userId);
    res.json(secrets);
  } catch (error) {
    next(error);
  }
};

export const createSecret = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || 'local-user';
    const { scope, label, value } = CreateSecretSchema.parse(req.body);

    const ref = await secretsService.setSecret(userId, scope, label, value);
    res.status(201).json(ref);
  } catch (error) {
    next(error);
  }
};

export const deleteSecret = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id || 'local-user';
    const id = req.params.id as string;
    if (!id) return res.status(400).json({ error: 'Secret ID is required' });

    await secretsService.deleteSecret(userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
