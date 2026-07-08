import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  NL_TO_REQUEST_SYSTEM_PROMPT,
  buildNLToRequestUserPrompt,
  type NLToRequestContext,
} from '../prompts/nl-to-request.prompt';

// ===== Zod Schema for Structured Output =====

const KeyValuePairSchema = z.object({
  key: z.string().describe('Header or param key name'),
  value: z.string().describe('Header or param value'),
});

export const GeneratedRequestSchema = z.object({
  method: z
    .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    .describe('HTTP method inferred from the user intent'),
  url: z
    .string()
    .describe(
      'Full URL or path with {{variable}} placeholders. Empty string if intent is unclear.',
    ),
  headers: z
    .array(KeyValuePairSchema)
    .describe('Request headers (e.g., Content-Type, Authorization)'),
  queryParams: z
    .array(KeyValuePairSchema)
    .describe('URL query parameters as separate key-value pairs, not embedded in URL'),
  body: z
    .string()
    .describe(
      'JSON string of the request body for POST/PUT/PATCH. Empty string for GET/DELETE.',
    ),
  bodyType: z
    .enum(['none', 'json', 'form-data'])
    .describe('Body mode: none for GET/DELETE, json for most POST/PUT/PATCH'),
  authSuggestion: z
    .enum(['none', 'bearer', 'api-key', 'basic'])
    .describe('Recommended auth type based on the collection context'),
  explanation: z
    .string()
    .describe(
      'Brief explanation of what was generated and why, or a clarifying question if intent is ambiguous',
    ),
});

export type GeneratedRequest = z.infer<typeof GeneratedRequestSchema>;

// ===== Service =====

/**
 * NL-to-Request Service — converts a plain English description into a
 * complete, structured API request configuration using the LLM.
 *
 * Security: Only variable NAMES are sent to the AI — never actual values.
 */
export class NLToRequestService {
  async convertToRequest(ctx: NLToRequestContext): Promise<GeneratedRequest> {
    // Enforce the 500-character limit on natural language input
    const truncated = ctx.naturalLanguage.substring(0, 500);

    const result = await llmGateway.completeStructured({
      systemPrompt: NL_TO_REQUEST_SYSTEM_PROMPT,
      userPrompt: buildNLToRequestUserPrompt({
        ...ctx,
        naturalLanguage: truncated,
      }),
      responseSchema: GeneratedRequestSchema,
      schemaName: 'generated_request',
      temperature: 0.3,
      maxTokens: 2000,
    });

    return result.parsed;
  }
}
