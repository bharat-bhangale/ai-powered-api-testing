import { apiClient } from './api';

// ===== Types =====

export interface PassRateGauge {
  passRate: number;
  totalTests: number;
  passed: number;
  failed: number;
}

export interface TrendPoint {
  date: string;
  passed: number;
  failed: number;
  total: number;
}

export interface SlowestEndpoint {
  method: string;
  url: string;
  avgTiming: number;
  requestCount: number;
}

export interface RecentFailure {
  runId: string;
  collectionName: string;
  requestName: string;
  testName: string;
  error: string;
  failedAt: string;
}

export interface CollectionHealth {
  collectionId: string;
  collectionName: string;
  passRate: number;
  totalTests: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

export interface DashboardData {
  passRate: PassRateGauge;
  trend: TrendPoint[];
  slowestEndpoints: SlowestEndpoint[];
  recentFailures: RecentFailure[];
  collectionHealth: CollectionHealth[];
}

export interface CoverageAnalysis {
  coverage: {
    score: number;
    testedEndpoints: number;
    totalEndpoints: number;
    untestedEndpoints: string[];
  };
  missingTests: Array<{
    endpoint: string;
    gap: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  securityGaps: Array<{
    endpoint: string;
    issue: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  suggestions: string[];
}

// ===== API Calls =====

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await apiClient.get('/api/dashboard');
  return res.data.data;
}

export async function analyzeCoverage(collectionId: string): Promise<CoverageAnalysis> {
  const res = await apiClient.post('/api/ai/analyze-coverage', { collectionId });
  return res.data.data;
}
