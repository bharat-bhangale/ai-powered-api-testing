import type { Request, Response } from 'express';
import { SchemaValidatorService } from './schema-validator.service';

const schemaValidator = new SchemaValidatorService();

/** POST /api/schema-validator/validate — Validate a response body against its schema contract */
export async function validateResponse(req: Request, res: Response): Promise<void> {
  try {
    const { method, url, status, body } = req.body;

    if (!method || !url || status === undefined) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'method, url, and status are required' },
      });
      return;
    }

    const violations = await schemaValidator.processResponse(
      req.userId!,
      method,
      url,
      status,
      body,
    );

    res.json({ success: true, data: { violations, count: violations.length } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Schema validation failed';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/schema-validator/contracts — List all schema contracts */
export async function listContracts(req: Request, res: Response): Promise<void> {
  try {
    const contracts = await schemaValidator.listContracts(req.userId!);
    res.json({ success: true, data: { contracts } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list contracts';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** GET /api/schema-validator/contract?method=GET&url=... — Get a specific contract */
export async function getContract(req: Request, res: Response): Promise<void> {
  try {
    const method = req.query.method as string;
    const url = req.query.url as string;

    if (!method || !url) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'method and url query params are required' },
      });
      return;
    }

    const contract = await schemaValidator.getContract(req.userId!, method, url);

    if (!contract) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No schema contract for this endpoint' },
      });
      return;
    }

    res.json({ success: true, data: { contract } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get contract';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** DELETE /api/schema-validator/contracts/:id — Delete (reset) a contract */
export async function deleteContract(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await schemaValidator.deleteContract(req.userId!, req.params.id as string);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Contract not found' },
      });
      return;
    }
    res.json({ success: true, data: { message: 'Contract deleted' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete contract';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/** POST /api/schema-validator/re-infer — Force re-inference from history */
export async function reInferContract(req: Request, res: Response): Promise<void> {
  try {
    const { method, url } = req.body;

    if (!method || !url) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'method and url are required' },
      });
      return;
    }

    const contract = await schemaValidator.reInfer(req.userId!, method, url);

    if (!contract) {
      res.status(400).json({
        success: false,
        error: { code: 'INSUFFICIENT_DATA', message: 'Not enough history entries to infer a schema (need at least 3)' },
      });
      return;
    }

    res.json({ success: true, data: { contract } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Re-inference failed';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}
