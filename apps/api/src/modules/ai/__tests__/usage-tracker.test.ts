import { describe, it, expect } from 'vitest';
import { UsageTracker } from '../utils/usage-tracker';

describe('UsageTracker', () => {
  it('allows a fresh user to use AI', () => {
    const tracker = new UsageTracker();
    expect(tracker.canUse('fresh-user-1')).toBe(true);
  });

  it('returns correct initial usage', () => {
    const tracker = new UsageTracker();
    const usage = tracker.getUsage('fresh-user-2');
    expect(usage.used).toBe(0);
    expect(usage.limit).toBe(50);
    expect(usage.remaining).toBe(50);
  });

  it('increments usage correctly', () => {
    const tracker = new UsageTracker();
    const result = tracker.increment('inc-user');
    expect(result.used).toBe(1);
    expect(result.remaining).toBe(49);
  });

  it('blocks after reaching daily limit', () => {
    const tracker = new UsageTracker();
    const userId = 'limit-user';

    // Use up all 50 requests
    for (let i = 0; i < 50; i++) {
      tracker.increment(userId);
    }

    expect(tracker.canUse(userId)).toBe(false);
    const usage = tracker.getUsage(userId);
    expect(usage.used).toBe(50);
    expect(usage.remaining).toBe(0);
  });

  it('tracks separate users independently', () => {
    const tracker = new UsageTracker();
    tracker.increment('user-a');
    tracker.increment('user-a');
    tracker.increment('user-b');

    expect(tracker.getUsage('user-a').used).toBe(2);
    expect(tracker.getUsage('user-b').used).toBe(1);
  });

  it('reports correct remaining after multiple increments', () => {
    const tracker = new UsageTracker();
    const userId = 'multi-inc';

    tracker.increment(userId);
    tracker.increment(userId);
    tracker.increment(userId);

    const usage = tracker.getUsage(userId);
    expect(usage.used).toBe(3);
    expect(usage.remaining).toBe(47);
    expect(usage.limit).toBe(50);
  });
});
