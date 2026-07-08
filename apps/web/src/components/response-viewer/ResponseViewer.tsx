import { useState } from 'react';
import type { ExecutionResponse } from '@/stores/requestStore';
import { ResponseMeta } from './ResponseMeta';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import { AITestSuggestions } from '@/components/ai/AITestSuggestions';
import { AIDebugPanel } from '@/components/ai/AIDebugPanel';
import { AnomalyBanner } from '@/components/anomaly/AnomalyBanner';
import { AnomalyDetailPanel } from '@/components/anomaly/AnomalyDetailPanel';
import { AnomalyIndicator } from '@/components/anomaly/AnomalyIndicator';
import styles from './ResponseViewer.module.css';

type ResponseTab = 'body' | 'headers' | 'cookies';

interface ResponseViewerProps {
  response: ExecutionResponse | null;
  isLoading: boolean;
}

/**
 * Response viewer panel — shows status, timing, size, tabbed content,
 * plus AI Generate Tests and AI Debug buttons.
 */
export const ResponseViewer = ({ response, isLoading }: ResponseViewerProps) => {
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.skeletonBar} />
          <div className={styles.skeletonBlock} />
        </div>
      </div>
    );
  }

  // Empty state
  if (!response) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>↗</div>
          <p>Send a request to see the response here</p>
          <span className={styles.emptyHint}>Ctrl + Enter to send</span>
        </div>
      </div>
    );
  }

  // Error state (network error with no response)
  if (!response.success && response.error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <div className={styles.errorHeader}>
            <span className={styles.errorBadge}>{response.error.code}</span>
            <span className={styles.errorTime}>
              {response.response.timing.total}ms
            </span>
          </div>
          <p className={styles.errorMessage}>{response.error.message}</p>
        </div>
      </div>
    );
  }

  const resp = response.response;
  const headerEntries = Object.entries(resp.headers || {});

  const TABS: { key: ResponseTab; label: string; count?: number }[] = [
    { key: 'body', label: 'Body' },
    { key: 'headers', label: 'Headers', count: headerEntries.length },
    { key: 'cookies', label: 'Cookies' },
  ];

  return (
    <div className={`${styles.container} ${styles.hasResponse}`}>
      {/* Response meta (status, time, size) + AI action buttons */}
      <div className={styles.metaRow}>
        <ResponseMeta
          status={resp.status}
          statusText={resp.statusText}
          time={resp.timing.total}
          size={resp.size}
        />
        <AnomalyIndicator />
        <div className={styles.aiActions}>
          <AITestSuggestions />
          <AIDebugPanel />
        </div>
      </div>

      {/* Anomaly banner + detail panel */}
      <AnomalyBanner />
      <AnomalyDetailPanel />

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={styles.tabBadge}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.content}>
        {activeTab === 'body' && <ResponseBody body={resp.body} />}
        {activeTab === 'headers' && <ResponseHeaders headers={resp.headers} />}
        {activeTab === 'cookies' && (
          <div className={styles.emptyTab}>No cookies returned</div>
        )}
      </div>
    </div>
  );
};
