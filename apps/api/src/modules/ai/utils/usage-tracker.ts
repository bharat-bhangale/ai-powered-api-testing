/**
 * AI Usage Tracker — in-memory daily counter per user.
 * Tracks AI requests to enforce daily limits (50/day for free plan).
 * In production, replace with Redis + TTL for persistence.
 */

const usageMap = new Map<string, { count: number; resetDate: string }>();

const DAILY_LIMIT = 50;

export class UsageTracker {
  /** Check if user has remaining AI requests today */
  canUse(userId: string): boolean {
    const today = new Date().toISOString().split('T')[0]!;
    const usage = usageMap.get(userId);

    if (!usage || usage.resetDate !== today) {
      return true;
    }

    return usage.count < DAILY_LIMIT;
  }

  /** Increment usage counter and return current stats */
  increment(userId: string): { used: number; limit: number; remaining: number } {
    const today = new Date().toISOString().split('T')[0]!;
    let usage = usageMap.get(userId);

    if (!usage || usage.resetDate !== today) {
      usage = { count: 0, resetDate: today };
    }

    usage.count++;
    usageMap.set(userId, usage);

    return {
      used: usage.count,
      limit: DAILY_LIMIT,
      remaining: DAILY_LIMIT - usage.count,
    };
  }

  /** Get current usage without incrementing */
  getUsage(userId: string): { used: number; limit: number; remaining: number } {
    const today = new Date().toISOString().split('T')[0]!;
    const usage = usageMap.get(userId);

    const count = usage && usage.resetDate === today ? usage.count : 0;
    return { used: count, limit: DAILY_LIMIT, remaining: DAILY_LIMIT - count };
  }
}

/** Singleton tracker instance */
export const usageTracker = new UsageTracker();
