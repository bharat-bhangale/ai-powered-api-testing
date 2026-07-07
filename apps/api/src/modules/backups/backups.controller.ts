import type { Request, Response } from 'express';
import { BackupsService } from './backups.service';
import { exportBackupSchema, importBackupSchema } from './backups.validation';

const backupsService = new BackupsService();

/** POST /api/backups/export */
export async function exportBackup(req: Request, res: Response): Promise<void> {
  try {
    const parsed = exportBackupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' } });
      return;
    }
    
    const result = await backupsService.exportBackup(req.userId!, parsed.data.targetPath);
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to export backup';
    res.status(500).json({ success: false, error: { code: 'BACKUP_ERROR', message } });
  }
}

/** POST /api/backups/import */
export async function importBackup(req: Request, res: Response): Promise<void> {
  try {
    const parsed = importBackupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' } });
      return;
    }
    
    await backupsService.restoreBackup(req.userId!, parsed.data.manifest);
    res.json({ success: true, data: { message: 'Restore completed successfully' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to import backup';
    res.status(500).json({ success: false, error: { code: 'RESTORE_ERROR', message } });
  }
}
