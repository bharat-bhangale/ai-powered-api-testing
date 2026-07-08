/**
 * Diff Analyzer prompt templates.
 * AI categorizes a pre-computed structural diff into breaking changes,
 * deprecations, schema drift, and enhancements.
 */

export const DIFF_ANALYZER_SYSTEM_PROMPT = `You are an expert API governance engineer specializing in API versioning, breaking change detection, and migration guidance.

Your job is to analyze a structural diff between two snapshots of an API collection and categorize every detected change precisely.

CATEGORY DEFINITIONS:

BREAKING CHANGES — Client code will break without modification:
- Field removed from response (clients accessing it get undefined/error)
- Field type changed (string→number, object→array, etc.)
- Status code changed to a 4xx or 5xx
- Required field added to request body
- Endpoint removed entirely

DEPRECATIONS — Still working but scheduled for removal:
- X-Deprecation, Deprecation, or Sunset headers detected
- "deprecated": true field in response metadata
- Version-specific URL patterns suggesting old version (v1 still served while v2 exists)

SCHEMA DRIFT — Structural changes that aren't explicitly breaking but signal instability:
- Optional field removed (was sometimes absent, now never present)
- Response size changed significantly (>50% change)
- New required nested structure added
- Field renamed (old name gone, new name present with same type)

ENHANCEMENTS — Additive improvements that don't break clients:
- New optional fields added
- Additional status codes for new scenarios (201, 202, etc.)
- New endpoints added
- Improved response metadata (pagination, links, etc.)

RULES:
1. Be specific — reference the exact field path (e.g., "data.users[].profile.email")
2. Include migration advice for ALL breaking changes
3. If a field was renamed, detect it as a drift + note both old and new names
4. Don't fabricate changes — only categorize what's in the diff data
5. The summary should be a single sentence with exact counts`;

// ===== Input Types =====

export interface StructuralChange {
  endpoint: string;          // "GET /api/users"
  changeType:
    | 'field_removed'
    | 'field_added'
    | 'type_changed'
    | 'status_changed'
    | 'header_changed'
    | 'size_changed'
    | 'endpoint_added'
    | 'endpoint_removed';
  path?: string;             // dot-notation: "data.users[].email"
  oldValue?: string;         // e.g. "string" or "200"
  newValue?: string;         // e.g. "number" or "404"
  detail?: string;           // Additional context
}

export interface DiffAnalyzerInput {
  collectionName: string;
  baselineDate: string;
  currentDate: string;
  changes: StructuralChange[];
  endpointCount: number;
}

// ===== Prompt Builder =====

export function buildDiffAnalyzerPrompt(input: DiffAnalyzerInput): string {
  const changeLines = input.changes
    .map((c) => {
      const parts = [
        `[${c.changeType.toUpperCase()}]`,
        c.endpoint,
        c.path ? `path="${c.path}"` : '',
        c.oldValue ? `old="${c.oldValue}"` : '',
        c.newValue ? `new="${c.newValue}"` : '',
        c.detail ? `(${c.detail})` : '',
      ];
      return parts.filter(Boolean).join(' ');
    })
    .join('\n');

  return `Analyze this API diff for the "${input.collectionName}" collection.

Baseline snapshot: ${input.baselineDate}
Current snapshot:  ${input.currentDate}
Endpoints compared: ${input.endpointCount}

Detected structural changes (${input.changes.length} total):
${changeLines || '(no structural changes detected)'}

Categorize each change into:
1. breakingChanges — code will break
2. deprecations — working but going away
3. drifts — schema instability
4. enhancements — additive improvements

For breaking changes, always include:
- The exact client-side impact
- A specific migration path

If there are breaking changes, also produce a migrationGuide (Markdown format) that a developer can copy-paste.
If no changes, return empty arrays and summary "No changes detected between the two snapshots."`;
}
