import { apiClient } from '@/services/api';
import type { DiffStoreResult } from '@/stores/diffStore';

/**
 * Fetches snapshot dates that have history data for a collection.
 */
export async function getAvailableDiffDates(collectionId: string): Promise<string[]> {
  const res = await apiClient.get<{ success: boolean; data: { dates: string[] } }>(
    `/api/diff/dates?collectionId=${encodeURIComponent(collectionId)}`,
  );
  return res.data.data.dates;
}

/**
 * Runs the diff analysis between two dates.
 */
export async function runDiffAnalysis(params: {
  collectionId: string;
  baselineDate: string;
  currentDate: string;
}): Promise<DiffStoreResult> {
  const res = await apiClient.post<{ success: boolean; data: DiffStoreResult }>(
    '/api/diff/analyze',
    params,
  );
  return res.data.data;
}
