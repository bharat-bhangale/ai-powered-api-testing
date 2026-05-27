import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useAIStore } from '@/stores/aiStore';
import { apiClient } from '@/services/api';
import styles from './AIUsageIndicator.module.css';

/**
 * AIUsageIndicator — small badge showing AI request usage.
 * Color: green (<70%), yellow (70-90%), red (>90%).
 */
export const AIUsageIndicator = () => {
  const usage = useAIStore((s) => s.usage);
  const setUsage = useAIStore((s) => s.setUsage);

  // Fetch usage on mount
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await apiClient.get('/api/ai/usage');
        setUsage(res.data.data);
      } catch {
        // Silent fail — will show defaults
      }
    };
    fetchUsage();
  }, [setUsage]);

  const percentage = (usage.used / usage.limit) * 100;
  const colorClass = percentage >= 90 ? styles.red : percentage >= 70 ? styles.yellow : styles.green;

  return (
    <div className={`${styles.badge} ${colorClass}`} title={`AI requests today: ${usage.used}/${usage.limit}. Resets at midnight.`}>
      <Sparkles size={10} />
      <span>{usage.used}/{usage.limit}</span>
    </div>
  );
};
