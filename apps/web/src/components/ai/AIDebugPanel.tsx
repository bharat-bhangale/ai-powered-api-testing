import { useState, useCallback } from 'react';
import { X, Search, Copy, MessageSquare, AlertTriangle, AlertCircle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useAIStore } from '@/stores/aiStore';
import { useRequestStore } from '@/stores/requestStore';
import { apiClient } from '@/services/api';
import styles from './AIDebugPanel.module.css';

// ===== Types =====

interface DebugSuggestion {
  title: string;
  description: string;
  code?: string;
  priority: 'critical' | 'recommended' | 'optional';
}

interface DebugAnalysis {
  diagnosis: {
    cause: string;
    confidence: 'high' | 'medium' | 'low';
    explanation: string;
  };
  suggestions: DebugSuggestion[];
  relatedDocs?: string[];
}

const CONFIDENCE_MAP = {
  high: { label: 'High', className: 'confHigh' },
  medium: { label: 'Medium', className: 'confMedium' },
  low: { label: 'Low', className: 'confLow' },
};

const PRIORITY_ICONS = {
  critical: AlertCircle,
  recommended: AlertTriangle,
  optional: Lightbulb,
};

/**
 * AIDebugPanel — analyzes error responses (4xx/5xx) and shows
 * diagnosis with confidence, prioritized fix suggestions, and code examples.
 */
export const AIDebugPanel = () => {
  const { isDebugging, setDebugging, setUsage, openPanel } = useAIStore();
  const [analysis, setAnalysis] = useState<DebugAnalysis | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  /** Analyze current error response */
  const handleDebug = useCallback(async () => {
    const store = useRequestStore.getState();
    const tab = store.tabs.find((t) => t.id === store.activeTabId);
    if (!tab?.response) return;

    setDebugging(true);
    setIsVisible(true);

    try {
      const res = await apiClient.post('/api/ai/debug', {
        request: {
          method: tab.method,
          url: tab.url,
          headers: tab.response.request.resolvedHeaders,
          body: tab.response.request.resolvedBody,
        },
        response: tab.response.response,
      });

      setAnalysis(res.data.data);

      const remaining = res.headers['x-ai-usage-remaining'];
      if (remaining != null) {
        const used = 50 - Number(remaining);
        setUsage({ used, limit: 50, remaining: Number(remaining) });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to analyze error');
      setIsVisible(false);
    } finally {
      setDebugging(false);
    }
  }, [setDebugging, setUsage]);

  /** Copy code snippet to clipboard */
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  /** Open AI chat with follow-up context */
  const askFollowUp = useCallback(() => {
    const { addMessage } = useAIStore.getState();
    const store = useRequestStore.getState();
    const tab = store.tabs.find((t) => t.id === store.activeTabId);

    openPanel();
    if (analysis && tab?.response) {
      addMessage(
        'user',
        `I got a ${tab.response.response.status} error. The diagnosis says: "${analysis.diagnosis.cause}". Can you help me fix this?`,
      );
    }
  }, [analysis, openPanel]);

  /** Dismiss */
  const dismiss = () => {
    setIsVisible(false);
    setAnalysis(null);
  };

  // Check if current tab has an error response
  const errorStatus = useRequestStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.response?.response?.status ?? 0;
  });
  const isError = errorStatus >= 400;

  return (
    <>
      {/* Trigger Button */}
      {isError && !isVisible && (
        <button
          className={styles.triggerBtn}
          onClick={handleDebug}
          disabled={isDebugging}
          type="button"
        >
          <Search size={13} />
          {isDebugging ? 'Analyzing...' : 'Debug with AI'}
        </button>
      )}

      {/* Analysis Panel */}
      {isVisible && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Search size={14} className={styles.debugIcon} />
              <span className={styles.headerTitle}>AI Debug Analysis</span>
            </div>
            <button className={styles.closeBtn} onClick={dismiss} type="button">
              <X size={14} />
            </button>
          </div>

          {isDebugging ? (
            <div className={styles.loading}>
              <div className={styles.loadingPulse} />
              <p>AI is analyzing the error...</p>
            </div>
          ) : analysis ? (
            <div className={styles.content}>
              {/* Diagnosis */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>DIAGNOSIS</span>
                  <span className={`${styles.confBadge} ${styles[CONFIDENCE_MAP[analysis.diagnosis.confidence].className]!}`}>
                    {CONFIDENCE_MAP[analysis.diagnosis.confidence].label} confidence
                  </span>
                </div>
                <p className={styles.cause}>{analysis.diagnosis.cause}</p>
                <p className={styles.explanation}>{analysis.diagnosis.explanation}</p>
              </div>

              {/* Suggestions */}
              <div className={styles.section}>
                <span className={styles.sectionTitle}>SUGGESTED FIXES</span>
                {analysis.suggestions.map((sug, idx) => {
                  const PriorityIcon = PRIORITY_ICONS[sug.priority];
                  return (
                    <div key={idx} className={`${styles.suggestion} ${styles[`priority${sug.priority}`]!}`}>
                      <div className={styles.sugHeader}>
                        <PriorityIcon size={14} className={styles.sugIcon} />
                        <span className={styles.sugTitle}>{sug.title}</span>
                      </div>
                      <p className={styles.sugDesc}>{sug.description}</p>
                      {sug.code && (
                        <div className={styles.codeBlock}>
                          <code>{sug.code}</code>
                          <button
                            className={styles.copyCodeBtn}
                            onClick={() => copyCode(sug.code!)}
                            type="button"
                            title="Copy"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                <button className={styles.actionBtn} onClick={askFollowUp} type="button">
                  <MessageSquare size={13} />
                  Ask Follow-Up
                </button>
                <button className={`${styles.actionBtn} ${styles.actionSecondary}`} onClick={dismiss} type="button">
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
};
