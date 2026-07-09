/**
 * Security analysis prompt — AI analyzes raw vulnerability findings and
 * produces structured remediation guidance with a security score.
 */

export const SECURITY_ANALYSIS_SYSTEM_PROMPT = `You are a senior application security engineer specializing in API security and OWASP standards.
You have been given the results of an automated OWASP API Security Top 10 scan.
Your task is to analyze the findings, assign severity levels, write clear remediation guidance, and calculate an overall security score.

OWASP API Security Top 10 Categories:
- API1: Broken Object Level Authorization (BOLA/IDOR)
- API2: Broken Authentication
- API3: Broken Object Property Level Authorization (Mass Assignment)
- API4: Unrestricted Resource Consumption (Rate Limiting)
- API5: Broken Function Level Authorization
- API7: Security Misconfiguration

SEVERITY GUIDE:
- critical: Data breach risk (BOLA, auth bypass) — requires immediate fix
- high: Significant security flaw (mass assignment, no rate limiting on sensitive endpoints)
- medium: Configuration weakness (missing security headers, admin paths accessible)
- low: Best-practice violation (verbose errors but no sensitive data)
- info: Informational — no direct risk

SCORING:
Score starts at 100.
- critical finding: -25 each
- high finding: -15 each
- medium finding: -8 each
- low finding: -3 each
Minimum score: 0

REMEDIATION:
For each vulnerability, provide:
1. Clear description of the risk
2. Specific code example showing the fix (in pseudocode or the language implied by the API)
3. Security headers: show the exact header values to add

RULES:
- Only report genuine vulnerabilities found in the scan evidence
- Group related findings when possible (e.g., multiple endpoints with same auth bypass)
- Be specific — reference actual URLs, status codes, and response bodies from the evidence
- Provide actionable remediation, not generic advice
- Max 20 vulnerabilities in output`;

// ===== Input Type =====

export interface SecurityAnalysisInput {
  findings: Array<{
    checkId: string;
    owaspCategory: string;
    endpoint: string;
    checkTitle: string;
    vulnerable: boolean;
    evidence: string;
    statusCode?: number;
    responseSnippet?: string;
  }>;
  collectionName: string;
}

// ===== Prompt Builder =====

export function buildSecurityAnalysisPrompt(input: SecurityAnalysisInput): string {
  const vulnFindings = input.findings.filter((f) => f.vulnerable);
  const passedCount = input.findings.length - vulnFindings.length;

  const findingsText = input.findings
    .map((f, i) =>
      `[${i + 1}] ${f.vulnerable ? '⚠️ VULNERABLE' : '✅ PASSED'} — ${f.checkTitle}
   Endpoint: ${f.endpoint}
   Category: ${f.owaspCategory}
   Evidence: ${f.evidence}${f.statusCode ? `\n   Status: ${f.statusCode}` : ''}${
        f.responseSnippet
          ? `\n   Response: ${f.responseSnippet.substring(0, 300)}`
          : ''
      }`
    )
    .join('\n\n');

  return `Analyze the following security scan results for API collection: "${input.collectionName}"

SCAN SUMMARY:
Total checks: ${input.findings.length}
Vulnerabilities found: ${vulnFindings.length}
Checks passed: ${passedCount}

DETAILED FINDINGS:
${findingsText}

Based on these findings, provide:
1. A security score (0-100) calculated per the scoring guide
2. Structured vulnerability objects for each VULNERABLE finding
3. A 2-3 sentence executive summary
4. 3-5 concrete, prioritized recommendations

Only include findings that are marked VULNERABLE. Return valid JSON.`;
}
