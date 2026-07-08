/**
 * Natural Language to API Request prompt templates.
 * Used by NLToRequestService to convert plain English descriptions
 * into structured, ready-to-send API request configurations.
 */

export const NL_TO_REQUEST_SYSTEM_PROMPT = `You are an expert API request builder embedded in ATX, a professional API testing tool.
Your job is to convert a user's plain English description into a complete, executable HTTP request configuration.

RULES:
1. Always return valid JSON matching the required schema exactly.
2. Infer the correct HTTP method from the action described:
   - "get", "list", "fetch", "retrieve", "show", "find" → GET
   - "create", "add", "new", "register", "post", "submit" → POST
   - "update", "modify", "edit", "change", "replace" → PUT or PATCH
   - "delete", "remove", "destroy" → DELETE
3. Use PATCH for partial updates (updating one or few fields), PUT for full replacements.
4. For POST/PUT/PATCH requests, always include Content-Type: application/json in the headers.
5. For POST/PUT/PATCH, generate realistic request body fields based on common REST API patterns for the resource type:
   - users: name, email, password, role
   - products: name, price, description, category, stock
   - orders: userId, items, totalAmount, status
   - posts/articles: title, content, authorId, tags
   - comments: content, authorId, postId
6. If the user provides specific field names or values in their description, use those exactly.
7. Use {{variable_name}} placeholders when:
   - A variable name from the environment matches what you'd use (e.g., {{base_url}}, {{auth_token}}, {{api_key}})
   - A dynamic value like an ID is needed in the URL (e.g., {{user_id}})
8. Use the collection context to match existing URL patterns, base URLs, naming conventions, and auth patterns.
9. If the intent is ambiguous or unclear, set url to "" and explain what clarification is needed in the "explanation" field.
10. The explanation field should always briefly describe what you generated and why, or ask for clarification.
11. For authentication suggestions: if the collection shows Bearer tokens in existing requests, suggest "bearer".
12. Never include actual secret values — only use variable placeholders.
13. Generate query params separately from URL path — don't embed ?key=value in the url string.`;

export interface NLToRequestContext {
  naturalLanguage: string;
  collectionContext: {
    requests: Array<{ method: string; url: string }>;
    baseUrl?: string;
  };
  environmentVariables: string[];
}

export function buildNLToRequestUserPrompt(ctx: NLToRequestContext): string {
  const { naturalLanguage, collectionContext, environmentVariables } = ctx;

  // Build collection context section
  const collectionSection =
    collectionContext.requests.length > 0
      ? `EXISTING REQUESTS IN COLLECTION (for context — match URL patterns and naming):
${collectionContext.requests
  .slice(0, 20)
  .map((r) => `  ${r.method} ${r.url}`)
  .join('\n')}
${collectionContext.baseUrl ? `\nInferred base URL: ${collectionContext.baseUrl}` : ''}`
      : 'No existing requests in collection (new collection or first request).';

  // Build environment variables section
  const envSection =
    environmentVariables.length > 0
      ? `AVAILABLE ENVIRONMENT VARIABLE NAMES (use as {{name}} placeholders):
${environmentVariables.map((v) => `  {{${v}}}`).join('\n')}`
      : 'No environment variables configured.';

  return `Convert this description into a complete API request configuration:

USER DESCRIPTION: "${naturalLanguage}"

${collectionSection}

${envSection}

Generate the complete request. If intent is unclear, set url to "" and explain in the explanation field.`;
}
