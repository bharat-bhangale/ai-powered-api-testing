import { useEffect, useCallback, useRef } from 'react';
import { Search, Trash2, Clock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useHistoryStore, type HistoryEntry } from '@/stores/historyStore';
import { useRequestStore } from '@/stores/requestStore';
import styles from './HistoryPanel.module.css';

const METHOD_FILTERS = [
  { value: null, label: 'All' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'PATCH', label: 'PATCH' },
];

/**
 * History Panel — shows past requests grouped by time.
 * Search, method filter, click to replay, infinite scroll.
 */
export const HistoryPanel = () => {
  const {
    entries,
    isLoading,
    hasMore,
    search,
    methodFilter,
    fetchHistory,
    loadMore,
    setSearch,
    setMethodFilter,
    clearHistory,
  } = useHistoryStore();

  const { addTab } = useRequestStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || isLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  // Click to replay — populate a new tab with the request
  const handleReplay = useCallback(
    (entry: HistoryEntry) => {
      addTab();
      // Small delay so the new tab is active before we update it
      setTimeout(() => {
        const store = useRequestStore.getState();
        const newTab = store.tabs[store.tabs.length - 1];
        if (!newTab) return;
        store.updateMethod(entry.request.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS');
        store.updateUrl(entry.request.url);
        store.setResponse(newTab.id, {
          success: true,
          request: {
            resolvedUrl: entry.request.url,
            resolvedHeaders: entry.request.headers || {},
            resolvedBody: entry.request.body || null,
          },
          response: entry.response,
          executedAt: entry.executedAt,
        });
      }, 50);
      toast.success('History entry loaded');
    },
    [addTab],
  );

  // Clear all with confirmation
  const handleClear = useCallback(async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    await clearHistory();
    toast.success('History cleared');
  }, [clearHistory]);

  // Group entries by time
  const groups = groupByTime(entries);

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Clock size={14} />
          History
        </h3>
        {entries.length > 0 && (
          <button className={styles.clearBtn} onClick={handleClear} type="button" title="Clear All">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={13} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search URLs..."
            spellCheck={false}
          />
        </div>
        <select
          className={styles.methodSelect}
          value={methodFilter || ''}
          onChange={(e) => setMethodFilter(e.target.value || null)}
        >
          {METHOD_FILTERS.map((f) => (
            <option key={f.label} value={f.value || ''}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Entries */}
      <div className={styles.list} ref={scrollRef} onScroll={handleScroll}>
        {isLoading && entries.length === 0 ? (
          <div className={styles.loading}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ width: '70%' }} />
            <div className={styles.skeletonLine} style={{ width: '85%' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <Clock size={32} />
            <p>No history yet</p>
            <span>Send a request to see it here</span>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupHeader}>
                <span>{group.label}</span>
                <span className={styles.groupCount}>{group.entries.length}</span>
              </div>
              {group.entries.map((entry) => (
                <button
                  key={entry._id}
                  className={styles.entry}
                  onClick={() => handleReplay(entry)}
                  type="button"
                >
                  <span className={`${styles.methodBadge} ${styles[`method${entry.request.method}`]}`}>
                    {entry.request.method}
                  </span>
                  <span className={styles.entryUrl}>{truncateUrl(entry.request.url)}</span>
                  <div className={styles.entryMeta}>
                    <span className={`${styles.statusBadge} ${getStatusClass(entry.response.status)}`}>
                      {entry.response.status}
                    </span>
                    <span className={styles.timing}>{entry.response.timing.total}ms</span>
                    <span className={styles.entryTime}>{formatRelativeTime(entry.executedAt)}</span>
                  </div>
                  <RotateCcw size={12} className={styles.replayIcon} />
                </button>
              ))}
            </div>
          ))
        )}
        {isLoading && entries.length > 0 && (
          <div className={styles.loadingMore}>Loading more...</div>
        )}
      </div>
    </div>
  );
};

// ===== Helpers =====

interface HistoryGroup {
  label: string;
  entries: HistoryEntry[];
}

function groupByTime(entries: HistoryEntry[]): HistoryGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, HistoryEntry[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    Older: [],
  };

  entries.forEach((entry) => {
    const date = new Date(entry.executedAt);
    if (date >= today) {
      groups.Today!.push(entry);
    } else if (date >= yesterday) {
      groups.Yesterday!.push(entry);
    } else if (date >= weekAgo) {
      groups['Last 7 Days']!.push(entry);
    } else {
      groups.Older!.push(entry);
    }
  });

  return Object.entries(groups)
    .filter(([, entries]) => entries.length > 0)
    .map(([label, entries]) => ({ label, entries }));
}

function truncateUrl(url: string): string {
  if (url.length <= 45) return url;
  return url.substring(0, 42) + '...';
}

function getStatusClass(status: number): string {
  if (status >= 200 && status < 300) return styles.status2xx!;
  if (status >= 300 && status < 400) return styles.status3xx!;
  if (status >= 400 && status < 500) return styles.status4xx!;
  if (status >= 500) return styles.status5xx!;
  return '';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
