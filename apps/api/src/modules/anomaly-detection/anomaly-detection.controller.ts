import type { Request, Response } from 'express';
import { anomalyDetectionService, normalizeEndpointKey } from './anomaly-detection.service';
import { baselineStore } from './Baseline.model';
import { AnomalyExplainerService } from '../ai/features/anomaly-explainer.service';
import type { AnomalyExplanationInput } from '../ai/prompts/anomaly-explanation.prompt';

const explainerService = new AnomalyExplainerService();

/**
 * POST /api/anomalies/analyze
 * Analyze a response against the learned baseline.
 * Called by the frontend immediately after each successful request.
 *
 * Body: { method, url, status, responseTimeMs, responseSizeBytes, responseBody }
 */
export async function analyzeResponse(req: Request, res: Response): Promise<void> {
  try {
    const { method, url, status, responseTimeMs, responseSizeBytes, responseBody } = req.body;

    if (!method || !url || status == null || responseTimeMs == null) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'method, url, status, responseTimeMs are required' },
      });
      return;
    }

    const result = anomalyDetectionService.analyze({
      userId: req.userId!,
      method,
      url,
      status: Number(status),
      responseTimeMs: Number(responseTimeMs),
      responseSizeBytes: Number(responseSizeBytes || 0),
      responseBody,
    });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Anomaly analysis failed';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * GET /api/anomalies/baseline/:endpointKey
 * Return the stored baseline for an endpoint (URL-encoded key).
 */
export function getBaseline(req: Request, res: Response): void {
  try {
    const { endpointKey } = req.params;
    const decoded = decodeURIComponent(endpointKey);
    const baseline = baselineStore.get(req.userId!, decoded);

    if (!baseline) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No baseline found for this endpoint' },
      });
      return;
    }

    res.json({ success: true, data: baseline });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get baseline';
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message } });
  }
}

/**
 * GET /api/anomalies/baselines
 * List all baselines for the authenticated user.
 */
export function listBaselines(req: Request, res: Response): void {
  const baselines = baselineStore.getAll(req.userId!);
  res.json({ success: true, data: baselines });
}

/**
 * POST /api/anomalies/explain
 * AI explains an anomaly in natural language.
 * Called lazily — only when user clicks "Explain".
 *
 * Body: { type, severity, message, endpoint, details, baseline }
 */
export async function explainAnomaly(req: Request, res: Response): Promise<void> {
  try {
    const { type, severity, message, endpoint, details, baseline } = req.body;

    if (!type || !endpoint) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'type and endpoint are required' },
      });
      return;
    }

    const endpointKey = normalizeEndpointKey(
      endpoint.split(' ')[0] || 'GET',
      endpoint.split(' ')[1] || endpoint,
    );

    const storedBaseline = baselineStore.get(req.userId!, endpointKey);

    const input: AnomalyExplanationInput = {
      type,
      severity: severity || 'warning',
      message: message || '',
      endpoint,
      details: details || { expected: null, actual: null },
      baseline: {
        sampleCount: storedBaseline?.sampleCount ?? 0,
        avgResponseTime: storedBaseline?.responseTime.avg,
        avgResponseSize: storedBaseline?.responseSize.avg,
        statusCodes: storedBaseline?.statusCodes,
      },
    };

    const explanation = await explainerService.explain(input);
    res.json({ success: true, data: { explanation } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI explanation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}
