import { Request, Response, NextFunction } from 'express';
import { SettingsService } from './settings.service';
import { SetSettingSchema } from './settings.validation';

const settingsService = new SettingsService();

export const getSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key as string;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    const value = await settingsService.getSetting(key);
    res.json({ key, value });
  } catch (error) {
    next(error);
  }
};

export const setSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.key as string;
    if (!key) return res.status(400).json({ error: 'Key is required' });

    const { value } = SetSettingSchema.parse(req.body);
    await settingsService.setSetting(key, value);

    res.json({ key, value });
  } catch (error) {
    next(error);
  }
};

export const listSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.listSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};
