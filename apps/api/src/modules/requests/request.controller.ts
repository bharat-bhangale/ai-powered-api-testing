import type { Request, Response } from 'express';
import { RequestService } from './request.service';
import { createRequestSchema, updateRequestSchema } from '../../utils/validation';

const requestService = new RequestService();

/** POST /api/requests — Save request to collection */
export async function createRequest(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
      return;
    }
    const request = await requestService.create(req.userId!, parsed.data);
    res.status(201).json({ success: true, data: { request } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create request';
    res.status(400).json({ success: false, error: { code: 'REQUEST_ERROR', message } });
  }
}

/** GET /api/requests/:id — Get request details */
export async function getRequest(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const request = await requestService.getById(req.userId!, id);
    res.json({ success: true, data: { request } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request not found';
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } });
  }
}

/** PATCH /api/requests/:id — Update request */
export async function updateRequest(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const parsed = updateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input' },
      });
      return;
    }
    const request = await requestService.update(req.userId!, id, parsed.data as Record<string, unknown>);
    res.json({ success: true, data: { request } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update request';
    res.status(400).json({ success: false, error: { code: 'REQUEST_ERROR', message } });
  }
}

/** DELETE /api/requests/:id — Delete request */
export async function deleteRequest(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    await requestService.delete(req.userId!, id);
    res.json({ success: true, data: { message: 'Request deleted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete request';
    res.status(400).json({ success: false, error: { code: 'REQUEST_ERROR', message } });
  }
}

/** POST /api/requests/:id/duplicate — Duplicate request */
export async function duplicateRequest(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const request = await requestService.duplicate(req.userId!, id);
    res.status(201).json({ success: true, data: { request } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate request';
    res.status(400).json({ success: false, error: { code: 'REQUEST_ERROR', message } });
  }
}
