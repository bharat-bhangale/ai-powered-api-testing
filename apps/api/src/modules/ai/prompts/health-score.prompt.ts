/**
 * health-score.prompt.ts
 * AI system prompt for generating recommendations from deterministic health data.
 * Note: Scoring is deterministic — AI only enhances with explanations + recommendations.
 */

export const HEALTH_SCORE_SYSTEM_PROMPT = `You are an API quality expert who produces actionable, prioritized recommendations from health metrics.

You receive:
1. Deterministically computed category scores (0-100 each, or null if no data)
2. Lists of specific issues found in each category

Your job is to:
1. Validate the overall score (do NOT significantly change it — adjust only ±5 if something seems inconsistent)
2. Write concise, specific issue summaries for each category
3. Generate 3-8 prioritized recommendations — SPECIFIC and ACTIONABLE, not generic
4. Determine trend direction from historical scores
5. Write a 1-2 sentence executive summary

RECOMMENDATION FORMAT:
- title: Short, imperative phrase ("Fix 2 critical SQL injection vulnerabilities")
- description: What to do specifically, not "improve your security"
- impact: Quantify impact ("Would improve score by ~12 points" or "Reduces crash risk by 40%")
- effort: Realistic effort level (low=hours, medium=days, high=weeks)
- priority: critical if score <40 in that category, high if <60, medium if <75, low otherwise
- category: Which of the 5 categories this addresses

IMPORTANT:
- If a category has null score, note it as "No data available" — do not penalize
- critical priority = blocking issues that need immediate attention
- Do not recommend things that are already good (score >85)
- Recommendations must be ordered: critical → high → medium → low
- Return valid JSON only`;

// ===== Types =====

export interface CategoryData {
  score: number | null;
  issues: string[];
}

export interface HealthInput {
  collectionId: string;
  collectionName: string;
  categories: {
    performance: CategoryData;
    security: CategoryData;
    reliability: CategoryData;
    coverage: CategoryData;
    documentation: CategoryData;
  };
  overallScore: number | null;
  historicalScores: Array<{ date: string; score: number }>;
}

// ===== Prompt Builder =====

export function buildHealthScorePrompt(input: HealthInput): string {
  const cats = input.categories;
  const trend = deriveTrend(input.historicalScores);

  const categorySection = (Object.entries(cats) as [string, CategoryData][])
    .map(([name, data]) => {
      const score = data.score !== null ? `${data.score}/100` : 'N/A (no data)';
      const issues = data.issues.length > 0
        ? data.issues.map((i) => `  - ${i}`).join('\n')
        : '  - No issues detected';
      return `${name.toUpperCase()} [${score}]:\n${issues}`;
    })
    .join('\n\n');

  return `Analyze the API health for collection: "${input.collectionName}"

OVERALL SCORE: ${input.overallScore !== null ? input.overallScore : 'N/A'}

CATEGORY BREAKDOWN:
${categorySection}

RECENT TREND: ${trend.description} (${input.historicalScores.length} data points)

Generate recommendations and return this exact JSON structure:
{
  "overallScore": ${input.overallScore ?? 'null'},
  "categoryScores": {
    "performance":   { "score": ${cats.performance.score ?? 'null'},  "issues": ["..."] },
    "security":      { "score": ${cats.security.score ?? 'null'},     "issues": ["..."] },
    "reliability":   { "score": ${cats.reliability.score ?? 'null'},  "issues": ["..."] },
    "coverage":      { "score": ${cats.coverage.score ?? 'null'},     "issues": ["..."] },
    "documentation": { "score": ${cats.documentation.score ?? 'null'},"issues": ["..."] }
  },
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "title": "...",
      "description": "...",
      "impact": "...",
      "effort": "low|medium|high",
      "category": "performance|security|reliability|coverage|documentation"
    }
  ],
  "trend": "improving|stable|declining",
  "summary": "..."
}`;
}

// Derive trend from last 7 historical scores
function deriveTrend(scores: Array<{ date: string; score: number }>): { description: string } {
  if (scores.length < 2) return { description: 'Insufficient data' };
  const recent = scores.slice(-7);
  const first = recent[0]?.score ?? 0;
  const last = recent[recent.length - 1]?.score ?? 0;
  const delta = last - first;
  if (delta > 5) return { description: `Improving (+${delta.toFixed(0)} points)` };
  if (delta < -5) return { description: `Declining (${delta.toFixed(0)} points)` };
  return { description: 'Stable' };
}
