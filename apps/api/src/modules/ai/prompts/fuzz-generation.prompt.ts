/**
 * fuzz-generation.prompt.ts
 * AI generates context-aware fuzz payloads based on field semantics.
 */

export const FUZZ_GENERATION_SYSTEM_PROMPT = `You are an expert API security researcher specializing in fuzz testing.
Your task is to analyze API field names and types, then generate CONTEXTUALLY RELEVANT malicious payloads
that are most likely to expose vulnerabilities in those specific fields.

RULES:
1. For each field, generate 3-6 targeted payloads that exploit the field's specific semantics
2. Think about what the field MEANS (age → boundary numbers, email → injection formats, password → special chars)
3. Combine multiple attack classes (boundary + injection) for higher-value fields
4. Output must be valid JSON with an array of { fieldName, payloads: [{ label, value }] }
5. Value can be string, number, boolean, null, array, or object
6. Max 8 payloads per field, max 10 fields

FIELD-SPECIFIC INTELLIGENCE:
- email: SQL in email format, XSS in local part, overly long addresses, unicode homoglyphs
- password/secret: unicode normalization attacks, null bytes, length extremes, bcrypt DoS ($2b$10$...)
- age/count/quantity: -1, 0, 999999, MAX_INT, float (1.5), string ("abc")
- date/timestamp: past epoch, far future (9999), invalid format, timezone tricks
- url/href/link: javascript: protocol, file://, data:, SSRF targets (169.254.169.254)
- name/title: XSS, SQL injection, null bytes, very long strings
- id/uuid: negative numbers, sequential guessing, null UUID, SQL injection
- status/role/type: privilege escalation values ("admin", "superuser", "root", 0)
- price/amount: negative values, decimal precision, currency format injection
- phone: overflow, special chars, international formats with injection

Return valid JSON only.`;

export interface FieldAnalysis {
  name: string;
  value?: unknown;  // Current value (for context)
}

export interface AiPayloadSuggestion {
  fieldName: string;
  payloads: Array<{ label: string; value: unknown }>;
}

export function buildFuzzGenerationPrompt(fields: FieldAnalysis[]): string {
  const fieldList = fields
    .map((f) => `- "${f.name}"${f.value !== undefined ? ` (current value: ${JSON.stringify(f.value)})` : ''}`)
    .join('\n');

  return `Generate targeted fuzz payloads for the following API request fields:

${fieldList}

For each field, provide 3-6 payloads that would be most likely to:
1. Expose validation weaknesses
2. Trigger unexpected behavior or crashes
3. Test for injection vulnerabilities relevant to the field's semantics

Return JSON in this exact format:
{
  "suggestions": [
    {
      "fieldName": "email",
      "payloads": [
        { "label": "SQL in email", "value": "admin'--@test.com" },
        { "label": "XSS in email", "value": "<script>@test.com" }
      ]
    }
  ]
}`;
}
