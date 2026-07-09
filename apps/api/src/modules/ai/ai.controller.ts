import type { Request, Response } from 'express';
import { TestGeneratorService } from './features/test-generator.service';
import { DebugAssistantService } from './features/debug-assistant.service';
import { ChatService } from './features/chat.service';
import { SuiteGeneratorService } from './features/suite-generator.service';
import { CoverageAnalyzerService } from './features/coverage-analyzer.service';
import { ApiDocGeneratorService } from './features/api-doc-generator.service';
import { NLToRequestService } from './features/nl-to-request.service';
import { ConversationalTestBuilderService } from './features/conversational-test-builder.service';
import { PerformanceProfilerService } from './features/performance-profiler.service';
import { RequestOptimizerService } from './features/request-optimizer.service';
import { DataGeneratorService } from './features/data-generator.service';
import { HealthScoreService } from './features/health-score.service';
import { usageTracker } from './utils/usage-tracker';

const testGenerator = new TestGeneratorService();
const debugAssistant = new DebugAssistantService();
const chatService = new ChatService();
const suiteGenerator = new SuiteGeneratorService();
const coverageAnalyzer = new CoverageAnalyzerService();
const apiDocGenerator = new ApiDocGeneratorService();
const nlToRequestService = new NLToRequestService();
const convTestBuilderService = new ConversationalTestBuilderService();
const performanceProfiler = new PerformanceProfilerService();
const requestOptimizer = new RequestOptimizerService();
const dataGenerator = new DataGeneratorService();
const healthScoreService = new HealthScoreService();

/**
 * POST /api/ai/generate-tests
 * Generates structured test assertions from a request+response pair.
 */
export async function generateTests(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { request, response } = req.body;
    const result = await testGenerator.generateTests(request, response);
    const usage = usageTracker.increment(req.userId!);

    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI generation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/debug
 * Analyzes an error response and provides diagnosis + fix suggestions.
 */
export async function debugRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { request, response } = req.body;
    const result = await debugAssistant.analyze(request, response);
    const usage = usageTracker.increment(req.userId!);

    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI analysis failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/chat
 * Streaming chat with SSE — token-by-token response.
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { message, context } = req.body;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    for await (const chunk of chatService.chatStream(message, context)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    const usage = usageTracker.increment(req.userId!);
    res.write(`data: ${JSON.stringify({ done: true, usage })}\n\n`);
    res.end();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI chat failed';
    // If headers already sent, we can't change status code
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
}

/**
 * GET /api/ai/usage
 * Returns current AI usage stats for the authenticated user.
 */
export async function getUsage(req: Request, res: Response): Promise<void> {
  const usage = usageTracker.getUsage(req.userId!);
  res.json({ success: true, data: usage });
}

/**
 * POST /api/ai/generate-suite
 * Generates a comprehensive test suite for an entire collection.
 */
export async function generateSuite(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const result = await suiteGenerator.generateSuite(req.userId!, collectionId);
    const usage = usageTracker.increment(req.userId!);

    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI suite generation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/analyze-coverage
 * AI analyzes test coverage for a collection and identifies gaps.
 */
export async function analyzeCoverage(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const result = await coverageAnalyzer.analyze(req.userId!, collectionId);
    const usage = usageTracker.increment(req.userId!);

    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI coverage analysis failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/generate-docs
 * AI generates OpenAPI 3.0 documentation for a collection.
 * Returns structured doc data + OpenAPI JSON.
 */
export async function generateDocs(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const doc = await apiDocGenerator.generate(req.userId!, collectionId);
    const openapi = apiDocGenerator.toOpenApiJson(doc);
    const usage = usageTracker.increment(req.userId!);

    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: { doc, openapi } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI doc generation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/generate-docs/download
 * Returns OpenAPI 3.0 YAML as a downloadable file.
 * Query: ?format=yaml|json (default: yaml)
 */
export async function downloadDocs(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached.' },
      });
      return;
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const format = (req.query.format as string) || 'yaml';
    const doc = await apiDocGenerator.generate(req.userId!, collectionId);
    const openapi = apiDocGenerator.toOpenApiJson(doc);
    usageTracker.increment(req.userId!);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="openapi.json"');
      res.json(openapi);
    } else {
      const yaml = apiDocGenerator.toYaml(openapi);
      res.setHeader('Content-Type', 'text/yaml');
      res.setHeader('Content-Disposition', 'attachment; filename="openapi.yaml"');
      res.send(yaml);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Doc generation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/nl-to-request
 * Converts a plain English description into a complete API request configuration.
 * Body: { naturalLanguage, collectionContext, environmentVariables }
 */
export async function nlToRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { naturalLanguage, collectionContext, environmentVariables } = req.body;

    if (!naturalLanguage || typeof naturalLanguage !== 'string' || !naturalLanguage.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'naturalLanguage is required' },
      });
      return;
    }

    const result = await nlToRequestService.convertToRequest({
      naturalLanguage: naturalLanguage.trim(),
      collectionContext: collectionContext || { requests: [] },
      environmentVariables: Array.isArray(environmentVariables) ? environmentVariables : [],
    });

    const usage = usageTracker.increment(req.userId!);
    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'NL to request conversion failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/test-builder/message
 * Sends a message to the conversational test builder.
 * Body: { message, conversationHistory, requestContext, existingTestScript? }
 */
export async function testBuilderMessage(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { message, conversationHistory, requestContext, existingTestScript } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'message is required' },
      });
      return;
    }

    const result = await convTestBuilderService.sendMessage({
      message: message.trim(),
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory.slice(-20) : [],
      requestContext: requestContext || { method: 'GET', url: '' },
      existingTestScript: existingTestScript || '',
    });

    const usage = usageTracker.increment(req.userId!);
    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Test builder conversation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/performance-profile
 * AI analyzes timing data from history and identifies bottlenecks + optimizations.
 * Body: { collectionId: string }
 */
export async function performanceProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { collectionId } = req.body;
    if (!collectionId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const result = await performanceProfiler.profile(req.userId!, collectionId);
    const usage = usageTracker.increment(req.userId!);

    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Performance profiling failed';
    const status = message.includes('Minimum') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'PROFILE_ERROR', message } });
  }
}

/**
 * POST /api/ai/optimize-request
 * AI analyzes request configuration + response and returns optimization suggestions.
 * Body: { request, response }
 */
export async function optimizeRequest(req: Request, res: Response): Promise<void> {
  try {
    if (!usageTracker.canUse(req.userId!)) {
      res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached. Resets at midnight.' },
      });
      return;
    }

    const { request, response } = req.body;

    if (!request?.method || !request?.url) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'request.method and request.url are required' },
      });
      return;
    }

    if (!response?.status) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'response.status is required' },
      });
      return;
    }

    const result = await requestOptimizer.optimize(
      {
        method: request.method,
        url: request.url,
        headers: Array.isArray(request.headers) ? request.headers : [],
        params: Array.isArray(request.params) ? request.params : [],
        body: request.body || { mode: 'none', content: '' },
      },
      {
        status: response.status,
        statusText: response.statusText || '',
        headers: response.headers || {},
        body: response.body,
        size: response.size || 0,
        timing: response.timing?.total || 0,
      },
    );

    const usage = usageTracker.increment(req.userId!);
    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request optimization failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/generate-data
 * Generates contextually realistic test data from a request body structure.
 */
export async function generateData(req: Request, res: Response): Promise<void> {
  try {
    const { bodyStructure, method, url, preset, customInstruction } = req.body;

    if (!bodyStructure || typeof bodyStructure !== 'object') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'bodyStructure (object) is required' },
      });
      return;
    }

    const validPresets = ['happy_path', 'edge_cases', 'international', 'minimal', 'maximum'];
    const resolvedPreset = validPresets.includes(preset) ? preset : 'happy_path';

    const result = await dataGenerator.generate({
      bodyStructure: bodyStructure as Record<string, unknown>,
      method: String(method || 'POST'),
      url: String(url || '/'),
      preset: resolvedPreset,
      customInstruction: customInstruction ? String(customInstruction) : undefined,
    });

    const usage = usageTracker.increment(req.userId!);
    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Data generation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * POST /api/ai/health-score
 * Computes deterministic health score + AI recommendations for a collection.
 */
export async function healthScore(req: Request, res: Response): Promise<void> {
  try {
    const { collectionId } = req.body;
    if (!collectionId) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' },
      });
      return;
    }

    const result = await healthScoreService.compute(req.userId!, String(collectionId));
    const usage = usageTracker.increment(req.userId!);
    res.setHeader('X-AI-Usage-Remaining', String(usage.remaining));
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Health score computation failed';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}

/**
 * GET /api/ai/health-score/history?collectionId=xxx
 * Returns last 90 days of daily health scores for a collection.
 */
export async function getHealthHistory(req: Request, res: Response): Promise<void> {
  try {
    const collectionId = String(req.query['collectionId'] ?? '');
    if (!collectionId) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'collectionId is required' } });
      return;
    }
    const scores = await healthScoreService.getHistoricalScores(req.userId!, collectionId);
    res.json({ success: true, data: scores });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load health history';
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message } });
  }
}
