/**
 * Anomaly explanation prompt templates.
 * AI explains detected anomalies in plain English with actionable recommendations.
 */

export const ANOMALY_EXPLANATION_SYSTEM_PROMPT = `You are an expert API reliability engineer. 
Your job is to explain API anomalies in clear, actionable language that developers can immediately understand and act on.

RULES:
1. Be specific — reference actual numbers from the anomaly data.
2. Give 2-3 likely root causes in priority order.
3. Provide 2-3 specific, actionable remediation steps.
4. Keep the tone professional but approachable — not alarmist.
5. If the anomaly seems benign (e.g., a first-time new field), say so.
6. Response must be concise — max 150 words total.`;

// ===== Types =====

export interface AnomalyExplanationInput {
  type: string;
  severity: string;
  message: string;
  endpoint: string;
  details: {
    expected: unknown;
    actual: unknown;
  };
  baseline: {
    sampleCount: number;
    avgResponseTime?: number;
    avgResponseSize?: number;
    statusCodes?: Record<string, number>;
  };
}

// ===== Prompt Builder =====

export function buildAnomalyExplanationPrompt(input: AnomalyExplanationInput): string {
  return `Explain this API anomaly and suggest remediation steps.

Anomaly Type: ${input.type.toUpperCase()}
Severity: ${input.severity}
Endpoint: ${input.endpoint}
Message: ${input.message}

Details:
- Expected: ${JSON.stringify(input.details.expected)}
- Actual: ${JSON.stringify(input.details.actual)}

Baseline context (based on ${input.baseline.sampleCount} historical samples):
${input.baseline.avgResponseTime != null ? `- Average response time: ${input.baseline.avgResponseTime.toFixed(0)}ms` : ''}
${input.baseline.avgResponseSize != null ? `- Average response size: ${(input.baseline.avgResponseSize / 1024).toFixed(1)}KB` : ''}
${input.baseline.statusCodes ? `- Historical status codes: ${JSON.stringify(input.baseline.statusCodes)}` : ''}

Provide:
1. A brief plain-English explanation of what this anomaly means
2. 2-3 likely root causes (most likely first)
3. 2-3 specific remediation/investigation steps

Be concise and actionable.`;
}
