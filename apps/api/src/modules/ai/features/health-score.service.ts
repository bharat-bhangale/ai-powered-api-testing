import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { llmGateway } from '../llm-gateway';
import {
  HEALTH_SCORE_SYSTEM_PROMPT,
  buildHealthScorePrompt,
  type HealthInput,
  type CategoryData,
} from '../prompts/health-score.prompt';
import { History } from '../../../models/History.model';
import { SavedRequest } from '../../../models/Request.model';
import { Collection } from '../../../models/Collection.model';

// ===== Persistence (file-based, same pattern as Baseline.model) =====

const DATA_DIR = path.join(process.cwd(), '.health-scores');

interface DailyScore {
  date: string;    // YYYY-MM-DD
  score: number;
  collectionId: string;
  userId: string;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadScores(collectionId: string, userId: string): Promise<DailyScore[]> {
  await ensureDataDir();
  const file = path.join(DATA_DIR, `${userId}_${collectionId}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const all = JSON.parse(raw) as DailyScore[];
    // Keep last 90 days only
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return all.filter((s) => new Date(s.date) >= cutoff);
  } catch {
    return [];
  }
}

async function saveScore(entry: DailyScore): Promise<void> {
  await ensureDataDir();
  const file = path.join(DATA_DIR, `${entry.userId}_${entry.collectionId}.json`);
  const existing = await loadScores(entry.collectionId, entry.userId);
  // Replace today's entry if it exists
  const today = entry.date;
  const updated = [...existing.filter((s) => s.date !== today), entry];
  await fs.writeFile(file, JSON.stringify(updated, null, 2));
}

// ===== Zod Schema for AI Output =====

const RecommendationSchema = z.object({
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  effort: z.enum(['low', 'medium', 'high']),
  category: z.enum(['performance', 'security', 'reliability', 'coverage', 'documentation']),
});

const CategoryScoreSchema = z.object({
  score: z.number().nullable(),
  issues: z.array(z.string()),
});

const HealthOutputSchema = z.object({
  overallScore: z.number().nullable(),
  categoryScores: z.object({
    performance:   CategoryScoreSchema,
    security:      CategoryScoreSchema,
    reliability:   CategoryScoreSchema,
    coverage:      CategoryScoreSchema,
    documentation: CategoryScoreSchema,
  }),
  recommendations: z.array(RecommendationSchema),
  trend: z.enum(['improving', 'stable', 'declining']),
  summary: z.string(),
});

export type HealthOutput = z.infer<typeof HealthOutputSchema>;
export type HealthRecommendation = z.infer<typeof RecommendationSchema>;

// ===== Deterministic Scoring =====

/**
 * Score performance from history (last 100 responses for the collection).
 */
async function scorePerformance(collectionId: string, userId: string): Promise<CategoryData> {
  const entries = await History.find({ collectionId, userId })
    .sort({ executedAt: -1 })
    .limit(100)
    .select('response.timing response.status');

  if (entries.length === 0) return { score: null, issues: [] };

  const timings = entries
    .map((e) => e.response?.timing?.total ?? 0)
    .filter((t) => t > 0);

  if (timings.length === 0) return { score: null, issues: [] };

  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
  const sorted = [...timings].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;

  const issues: string[] = [];
  let score: number;

  if (avg < 100)       score = 100;
  else if (avg < 300)  score = 80;
  else if (avg < 500)  score = 60;
  else if (avg < 1000) score = 40;
  else if (avg < 3000) score = 20;
  else                 score = 0;

  if (avg > 300)  issues.push(`Avg response time: ${Math.round(avg)}ms (target <300ms)`);
  if (p95 > 1000) issues.push(`P95 response time: ${Math.round(p95)}ms (target <1000ms)`);

  const timeouts = entries.filter((e) => e.response?.status === 408 || e.response?.status === 504).length;
  if (timeouts > 0) {
    const timeoutRate = ((timeouts / entries.length) * 100).toFixed(1);
    issues.push(`${timeoutRate}% timeout rate (${timeouts} timeouts in last ${entries.length} requests)`);
    score = Math.max(0, score - timeouts * 5);
  }

  return { score: Math.round(score), issues };
}

/**
 * Score security from the most recent security report (file-based store).
 */
async function scoreSecurityFromReport(collectionId: string): Promise<CategoryData> {
  try {
    const reportDir = path.join(process.cwd(), '.security-reports');
    const files = await fs.readdir(reportDir).catch(() => []);
    const relevant = files.filter((f) => f.includes(collectionId)).sort().reverse();
    if (relevant.length === 0) return { score: null, issues: [] };

    const raw = await fs.readFile(path.join(reportDir, relevant[0]!), 'utf-8');
    const report = JSON.parse(raw) as {
      vulnerabilities?: Array<{ severity: string; title: string }>;
    };
    const vulns = report.vulnerabilities ?? [];

    let score = 100;
    const issues: string[] = [];

    const criticals = vulns.filter((v) => v.severity === 'critical');
    const highs     = vulns.filter((v) => v.severity === 'high');
    const mediums   = vulns.filter((v) => v.severity === 'medium');

    score -= criticals.length * 15;
    score -= highs.length * 8;
    score -= mediums.length * 3;
    score = Math.max(0, Math.min(100, score));

    if (criticals.length > 0) issues.push(`${criticals.length} critical vulnerabilit${criticals.length === 1 ? 'y' : 'ies'}: ${criticals.slice(0, 2).map((v) => v.title).join(', ')}`);
    if (highs.length > 0)     issues.push(`${highs.length} high severity vulnerabilit${highs.length === 1 ? 'y' : 'ies'}`);
    if (mediums.length > 0)   issues.push(`${mediums.length} medium severity vulnerabilit${mediums.length === 1 ? 'y' : 'ies'}`);

    return { score: Math.round(score), issues };
  } catch {
    return { score: null, issues: [] };
  }
}

/**
 * Score reliability from history (success rate).
 */
async function scoreReliability(collectionId: string, userId: string): Promise<CategoryData> {
  const entries = await History.find({ collectionId, userId })
    .sort({ executedAt: -1 })
    .limit(200)
    .select('response.status');

  if (entries.length === 0) return { score: null, issues: [] };

  const successes = entries.filter((e) => {
    const s = e.response?.status ?? 0;
    return s >= 200 && s < 400;
  }).length;

  const rate = successes / entries.length;
  const issues: string[] = [];
  let score: number;

  if (rate >= 0.99)      score = 100;
  else if (rate >= 0.95) score = 80;
  else if (rate >= 0.90) score = 60;
  else if (rate >= 0.80) score = 40;
  else                   score = 0;

  if (rate < 0.99) {
    issues.push(`${(rate * 100).toFixed(1)}% success rate (${entries.length - successes} failures in last ${entries.length} requests)`);
  }

  const serverErrors = entries.filter((e) => (e.response?.status ?? 0) >= 500).length;
  if (serverErrors > 0) {
    issues.push(`${serverErrors} 5xx server errors detected`);
  }

  return { score: Math.round(score), issues };
}

/**
 * Score test coverage from saved requests in the collection.
 */
async function scoreCoverage(collectionId: string, userId: string): Promise<CategoryData> {
  const requests = await SavedRequest.find({ collectionId, userId }).select('tests');
  if (requests.length === 0) return { score: null, issues: [] };

  const withTests = requests.filter((r) => {
    const script: string = (r as unknown as { tests?: string }).tests ?? '';
    return script.trim().length > 0;
  }).length;

  const score = Math.round((withTests / requests.length) * 100);
  const issues: string[] = [];

  if (score < 100) {
    const untested = requests.length - withTests;
    issues.push(`${untested} of ${requests.length} endpoints have no test scripts`);
  }
  if (score === 0) issues.push('No automated tests found — all endpoints untested');

  return { score, issues };
}

/**
 * Documentation score — heuristic based on request descriptions/names quality.
 */
async function scoreDocumentation(collectionId: string, userId: string): Promise<CategoryData> {
  const requests = await SavedRequest.find({ collectionId, userId }).select('name description');
  if (requests.length === 0) return { score: null, issues: [] };

  // "good" = name is not just a URL and has at least some description
  const wellDocumented = requests.filter((r) => {
    const name: string = (r as unknown as { name?: string }).name ?? '';
    const desc: string = (r as unknown as { description?: string }).description ?? '';
    return name.length > 3 && !name.startsWith('http') && desc.length > 10;
  }).length;

  const score = Math.round((wellDocumented / requests.length) * 100);
  const issues: string[] = [];

  if (score < 80) issues.push(`${requests.length - wellDocumented} endpoints lack meaningful descriptions`);
  if (score === 0) issues.push('No endpoint documentation found — use AI Doc Generator to create docs');

  return { score, issues };
}

/**
 * Compute weighted overall score (skips null categories).
 */
function computeOverall(cats: HealthInput['categories']): number | null {
  const weights = { performance: 0.25, security: 0.30, reliability: 0.20, coverage: 0.15, documentation: 0.10 };
  let weightSum = 0;
  let weightedSum = 0;

  for (const [key, weight] of Object.entries(weights) as [keyof typeof weights, number][]) {
    const score = cats[key].score;
    if (score !== null) {
      weightedSum += score * weight;
      weightSum += weight;
    }
  }

  if (weightSum === 0) return null;
  return Math.round(weightedSum / weightSum);
}

// ===== Main Service =====

export class HealthScoreService {
  async compute(userId: string, collectionId: string): Promise<HealthOutput> {
    // Load collection name
    const collection = await Collection.findOne({ _id: collectionId, userId });
    const collectionName = (collection as unknown as { name?: string })?.name ?? collectionId;

    // 1. Deterministic scoring (parallel)
    const [perf, sec, rel, cov, doc] = await Promise.all([
      scorePerformance(collectionId, userId),
      scoreSecurityFromReport(collectionId),
      scoreReliability(collectionId, userId),
      scoreCoverage(collectionId, userId),
      scoreDocumentation(collectionId, userId),
    ]);

    const categories: HealthInput['categories'] = {
      performance:   perf,
      security:      sec,
      reliability:   rel,
      coverage:      cov,
      documentation: doc,
    };

    const overallScore = computeOverall(categories);

    // 2. Load historical scores for trend
    const historicalScores = await loadScores(collectionId, userId);

    // 3. Save today's score
    if (overallScore !== null) {
      const today = new Date().toISOString().split('T')[0]!;
      await saveScore({ date: today, score: overallScore, collectionId, userId });
    }

    // 4. AI: generate recommendations
    const input: HealthInput = { collectionId, collectionName, categories, overallScore, historicalScores };

    const result = await llmGateway.completeStructured({
      systemPrompt: HEALTH_SCORE_SYSTEM_PROMPT,
      userPrompt: buildHealthScorePrompt(input),
      responseSchema: HealthOutputSchema,
      schemaName: 'health_score',
      temperature: 0.2,
      maxTokens: 2000,
    });

    // 5. Override with deterministic scores (AI must not change them significantly)
    const output = result.parsed as HealthOutput;
    output.overallScore = overallScore;
    output.categoryScores.performance.score   = perf.score;
    output.categoryScores.security.score      = sec.score;
    output.categoryScores.reliability.score   = rel.score;
    output.categoryScores.coverage.score      = cov.score;
    output.categoryScores.documentation.score = doc.score;

    return output;
  }

  async getHistoricalScores(userId: string, collectionId: string) {
    return loadScores(collectionId, userId);
  }
}
