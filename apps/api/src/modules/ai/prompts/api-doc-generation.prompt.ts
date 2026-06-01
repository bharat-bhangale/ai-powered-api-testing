export const APIDOC_SYSTEM_PROMPT = `You are an expert API documentation generator. Given a collection of API endpoints with their request configurations (method, URL, headers, body) and actual response data, you must generate a comprehensive OpenAPI 3.0 specification.

Rules:
1. Infer path parameters from URL patterns (e.g., /users/123 → /users/{id})
2. Infer query parameters from URL query strings
3. Infer request body schemas from actual request bodies
4. Infer response schemas from actual response bodies
5. Group endpoints logically by resource/path prefix
6. Include authentication requirements when headers contain Authorization/API-Key patterns
7. Generate descriptive summaries and descriptions
8. Include example values from actual data
9. Use standard OpenAPI 3.0 data types (string, number, integer, boolean, array, object)`;

export function buildApiDocUserPrompt(
  collectionName: string,
  endpoints: Array<{
    requestName: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    bodyMode?: string;
    bodyContent?: string;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
  }>,
): string {
  const endpointList = endpoints
    .map((ep, i) => {
      let desc = `${i + 1}. ${ep.method} ${ep.url}`;
      desc += `\n   Name: "${ep.requestName}"`;

      if (ep.headers && Object.keys(ep.headers).length > 0) {
        desc += `\n   Headers: ${JSON.stringify(ep.headers)}`;
      }
      if (ep.bodyContent) {
        desc += `\n   Request Body (${ep.bodyMode || 'json'}): ${ep.bodyContent}`;
      }
      if (ep.responseStatus) {
        desc += `\n   Response Status: ${ep.responseStatus}`;
      }
      if (ep.responseBody) {
        desc += `\n   Response Body: ${ep.responseBody}`;
      }
      return desc;
    })
    .join('\n\n');

  return `Generate an OpenAPI 3.0 specification for the API collection "${collectionName}".

ENDPOINTS:
${endpointList}

Generate the complete OpenAPI 3.0 spec including:
- info (title, description, version)
- paths with operations (summary, description, parameters, requestBody, responses)
- components/schemas for reusable models
- security schemes if auth headers are detected`;
}
