import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  SECURITY_ANALYSIS_SYSTEM_PROMPT,
  buildSecurityAnalysisPrompt,
  type SecurityAnalysisInput,
} from '../prompts/security-analysis.prompt';

// ===== Zod Schema =====

const VulnerabilitySchema = z.object({
  owaspCategory: z.enum(['API1', 'API2', 'API3', 'API4', 'API5', 'API7']),
  endpoint: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title: z.string(),
  description: z.string(),
  evidence: z.string(),
  remediation: z.string(),
  codeExample: z.string().optional(),
});

const SecurityAnalysisOutputSchema = z.object({
  securityScore: z.number().min(0).max(100),
  vulnerabilities: z.array(VulnerabilitySchema).max(20),
  summary: z.string(),
  recommendations: z.array(z.string()).max(8),
});

export type SecurityAnalysisOutput = z.infer<typeof SecurityAnalysisOutputSchema>;

/**
 * SecurityAnalyzerService — takes raw scan findings and uses AI to:
 * 1. Assign accurate severity levels
 * 2. Write actionable remediation with code examples
 * 3. Generate an executive summary and prioritized recommendations
 * 4. Calculate an overall security score
 */
export class SecurityAnalyzerService {
  async analyze(input: SecurityAnalysisInput): Promise<SecurityAnalysisOutput> {
    // If no vulnerable findings, return a clean report without calling AI
    const vulnCount = input.findings.filter((f) => f.vulnerable).length;
    if (vulnCount === 0) {
      return {
        securityScore: 100,
        vulnerabilities: [],
        summary: `All security checks passed for "${input.collectionName}". No OWASP API Top 10 vulnerabilities were detected in this scan.`,
        recommendations: [
          'Continue running regular security scans as your API evolves.',
          'Consider adding custom attack payloads for your specific business logic.',
          'Review your authentication flow periodically for token lifecycle issues.',
        ],
      };
    }

    const result = await llmGateway.completeStructured({
      systemPrompt: SECURITY_ANALYSIS_SYSTEM_PROMPT,
      userPrompt: buildSecurityAnalysisPrompt(input),
      responseSchema: SecurityAnalysisOutputSchema,
      schemaName: 'security_analysis',
      temperature: 0.2,
      maxTokens: 4000,
    });

    return result.parsed;
  }
}
