import type { Request, Response } from 'express';
import { TestGeneratorService } from './features/test-generator.service';
import { DebugAssistantService } from './features/debug-assistant.service';
import { ChatService } from './features/chat.service';
import { SuiteGeneratorService } from './features/suite-generator.service';
import { usageTracker } from './utils/usage-tracker';

const testGenerator = new TestGeneratorService();
const debugAssistant = new DebugAssistantService();
const chatService = new ChatService();
const suiteGenerator = new SuiteGeneratorService();

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
