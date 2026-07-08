import { llmGateway } from '../llm-gateway';
import {
  ANOMALY_EXPLANATION_SYSTEM_PROMPT,
  buildAnomalyExplanationPrompt,
  type AnomalyExplanationInput,
} from '../prompts/anomaly-explanation.prompt';

/**
 * AnomalyExplainerService — on-demand AI explanation of detected anomalies.
 * Called lazily (only when user clicks "Explain this anomaly").
 */
export class AnomalyExplainerService {
  /**
   * Generate a natural-language explanation and remediation guide for an anomaly.
   * Returns a plain text string (no structured output needed here).
   */
  async explain(input: AnomalyExplanationInput): Promise<string> {
    const result = await llmGateway.complete({
      systemPrompt: ANOMALY_EXPLANATION_SYSTEM_PROMPT,
      userPrompt: buildAnomalyExplanationPrompt(input),
      temperature: 0.3,
      maxTokens: 500,
    });

    return result.content.trim();
  }
}
