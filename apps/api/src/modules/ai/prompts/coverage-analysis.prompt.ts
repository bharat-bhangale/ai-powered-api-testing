export const COVERAGE_SYSTEM_PROMPT = `You are an expert API test coverage analyzer. Given a collection of API endpoints with their request configurations, saved test scripts, and historical responses, you must analyze the test coverage comprehensively.

Identify:
1. Which endpoints have tests and which don't
2. Missing test scenarios for each endpoint (error codes, edge cases, validation)
3. Security testing gaps (auth, injection, rate limiting)
4. Actionable improvement suggestions

Be specific and practical. Reference actual endpoint names and HTTP methods.`;

export function buildCoverageUserPrompt(
  collectionName: string,
  endpoints: Array<{
    requestName: string;
    method: string;
    url: string;
    hasTestScript: boolean;
    testScriptPreview?: string;
    responseStatus?: number;
    responseBodyPreview?: string;
  }>,
): string {
  const endpointList = endpoints
    .map((ep, i) => {
      let desc = `${i + 1}. ${ep.method} ${ep.url} (name: "${ep.requestName}")`;
      desc += `\n   Has test script: ${ep.hasTestScript ? 'YES' : 'NO'}`;
      if (ep.testScriptPreview) {
        desc += `\n   Test preview: ${ep.testScriptPreview}`;
      }
      if (ep.responseStatus) {
        desc += `\n   Last response status: ${ep.responseStatus}`;
      }
      if (ep.responseBodyPreview) {
        desc += `\n   Response preview: ${ep.responseBodyPreview}`;
      }
      return desc;
    })
    .join('\n\n');

  return `Analyze the test coverage for collection "${collectionName}":

ENDPOINTS:
${endpointList}

Provide a comprehensive coverage analysis with:
- A coverage score (0-100)
- Count of tested vs total endpoints
- List of untested endpoints
- Missing test scenarios per endpoint (with priority: critical/high/medium/low)
- Security testing gaps (with priority)
- Practical improvement suggestions`;
}
