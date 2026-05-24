import type { Request, Response } from 'express';
import { EnvironmentService } from './environment.service';
import { createEnvironmentSchema, updateEnvironmentSchema } from '../../utils/validation';

const environmentService = new EnvironmentService();

/** POST /api/environments — Create environment */
export async function createEnvironment(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createEnvironmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
      return;
    }
    const { name, variables } = parsed.data;
    const env = await environmentService.create(req.userId!, name, variables);
    res.status(201).json({ success: true, data: { environment: env } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create environment';
    res.status(400).json({ success: false, error: { code: 'ENVIRONMENT_ERROR', message } });
  }
}

/** GET /api/environments — List environments (secrets masked) */
export async function listEnvironments(req: Request, res: Response): Promise<void> {
  try {
    const environments = await environmentService.list(req.userId!);
    res.json({ success: true, data: { environments } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list environments';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/environments/:id — Get environment with real values */
export async function getEnvironment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const environment = await environmentService.getById(req.userId!, id);
    if (!environment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Environment not found' } });
      return;
    }
    res.json({ success: true, data: { environment } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Environment not found';
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
  }
}

/** PATCH /api/environments/:id — Update environment */
export async function updateEnvironment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = updateEnvironmentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
      return;
    }
    const environment = await environmentService.update(req.userId!, id, parsed.data);
    if (!environment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Environment not found' } });
      return;
    }
    res.json({ success: true, data: { environment } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update environment';
    res.status(400).json({ success: false, error: { code: 'ENVIRONMENT_ERROR', message } });
  }
}

/** DELETE /api/environments/:id — Delete environment */
export async function deleteEnvironment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const deleted = await environmentService.delete(req.userId!, id);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Environment not found' } });
      return;
    }
    res.json({ success: true, data: { message: 'Environment deleted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete environment';
    res.status(400).json({ success: false, error: { code: 'ENVIRONMENT_ERROR', message } });
  }
}

/** PATCH /api/environments/:id/default — Set as default environment */
export async function setDefaultEnvironment(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await environmentService.setDefault(req.userId!, id);
    res.json({ success: true, data: { message: 'Default environment updated' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to set default';
    res.status(400).json({ success: false, error: { code: 'ENVIRONMENT_ERROR', message } });
  }
}
