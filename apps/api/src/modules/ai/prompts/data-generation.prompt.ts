/**
 * data-generation.prompt.ts
 * AI system prompt for contextually intelligent test data generation.
 */

export type DataPreset =
  | 'happy_path'
  | 'edge_cases'
  | 'international'
  | 'minimal'
  | 'maximum';

export const DATA_GEN_SYSTEM_PROMPT = `You are an expert API test data engineer who generates contextually realistic, semantically coherent test data.

CORE PRINCIPLE: Generated data must make real-world sense. Fields must be consistent with each other.

CONSISTENCY RULES:
- name + email: If name is "John Doe", email should be "john.doe@example.com" (not random)
- city + state + zip: Must be internally consistent (San Francisco, CA, 94102)
- created_at + updated_at: updated_at must be after created_at
- price + currency: If currency is "USD", price should look like a USD amount (e.g., 29.99)
- country + phone: Phone format should match country (US: +1-555-xxx-xxxx, UK: +44-...)
- firstName + lastName + fullName: fullName should combine firstName and lastName
- latitude + longitude: Must be valid coordinates (lat: -90 to 90, lng: -180 to 180)
- url + slug: slug should be a URL-safe version of a related name field

FIELD SEMANTIC INTELLIGENCE:
- email → realistic email from name if name exists, otherwise realistic-looking test email
- password → secure-looking string (never "password123" for happy path)
- phone → valid formatted phone number
- age/years → reasonable integer for context (user: 18-80, experience: 0-40)
- price/cost/amount → realistic dollar amount (e.g., 29.99, 149.00, 1299.99)
- url/website/link → realistic https:// URL
- address → real-looking address (123 Main St, Apt 4B)
- zip/postal → valid format for country (US: 5 digits, UK: AA99 9AA)
- uuid/id → valid UUID v4 format
- date → ISO 8601 format (YYYY-MM-DD)
- datetime/timestamp → ISO 8601 with timezone
- boolean → contextually appropriate (active: true, deleted: false for happy path)
- status/state → contextually appropriate enum value (active, published, enabled)
- color → valid hex color or CSS color name
- image/photo/avatar → realistic placeholder URL (https://picsum.photos/200)
- token/key/secret → realistic-looking hash (not real credentials)

PRESET BEHAVIORS:
- happy_path: Fully valid, realistic data. Everything should pass validation perfectly.
- edge_cases: Use boundary values while remaining valid types. Empty strings where optional, max lengths, special chars in valid positions.
- international: Non-English names, international addresses, different date formats, various currencies.
- minimal: Only fill what's absolutely necessary. Minimal strings, smallest valid numbers.
- maximum: Fill everything. Long strings (within typical limits), large arrays, maximum realistic values.

OUTPUT FORMAT: Return valid JSON only. No explanations outside the JSON structure.`;

// ===== Input / Output Types =====

export interface DataGenInput {
  bodyStructure: Record<string, unknown>;
  method: string;
  url: string;
  preset: DataPreset;
  customInstruction?: string;
}

export interface DataVariation {
  name: string;
  body: Record<string, unknown>;
  description: string;
}

export interface DataGenOutput {
  generatedBody: Record<string, unknown>;
  explanation: string;
  variations: DataVariation[];
}

// ===== Prompt Builder =====

export function buildDataGenPrompt(input: DataGenInput): string {
  // Limit to 50 fields
  const bodyKeys = Object.keys(input.bodyStructure).slice(0, 50);
  const trimmedBody: Record<string, unknown> = {};
  for (const k of bodyKeys) {
    trimmedBody[k] = input.bodyStructure[k];
  }

  const presetDescriptions: Record<DataPreset, string> = {
    happy_path:    'Generate fully valid, realistic data that should pass all API validation.',
    edge_cases:    'Generate boundary/edge case values that are still valid types (empty strings, max lengths, special chars in valid fields).',
    international: 'Generate data for a non-English speaking international user (different country, language, address format).',
    minimal:       'Generate only the minimum required data with smallest valid values.',
    maximum:       'Generate maximum data: longest valid strings, largest numbers, all optional fields filled.',
  };

  const instruction = presetDescriptions[input.preset];
  const extra = input.customInstruction ? `\nADDITIONAL INSTRUCTION: ${input.customInstruction}` : '';

  return `Generate test data for a ${input.method} request to: ${input.url}

PRESET: ${input.preset.toUpperCase()}
INSTRUCTION: ${instruction}${extra}

CURRENT BODY STRUCTURE (field names with current/example values):
${JSON.stringify(trimmedBody, null, 2)}

Generate:
1. A primary "generatedBody" with contextually coherent, realistic values for ALL fields
2. A 1-2 sentence "explanation" describing what was generated
3. Exactly 3 "variations" offering different but equally valid data sets

Return this exact JSON structure:
{
  "generatedBody": { ...all fields with generated values... },
  "explanation": "...",
  "variations": [
    { "name": "Variation A", "body": {...}, "description": "..." },
    { "name": "Variation B", "body": {...}, "description": "..." },
    { "name": "Variation C", "body": {...}, "description": "..." }
  ]
}`;
}
