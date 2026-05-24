import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Trash2, Clock, RotateCcw, ChevronDown, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useHistoryStore, type HistoryEntry } from '@/stores/historyStore';
import { useRequestStore } from '@/stores/requestStore';
import styles from './HistoryPanel.module.css';

const METHOD_FILTERS = [
  { value: null, label: 'All' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DEL' },
  { value: 'PATCH', label: 'PATCH' },
];

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: '2xx', label: '2xx' },
  { value: '3xx', label: '3xx' },
  { value: '4xx', label: '4xx' },
  { value: '5xx', label: '5xx' },
];

/**
 * History Panel — shows past requests grouped by time.
 * Search, method filter, status filter, click to replay, collapsible groups,
 * save to collection, infinite scroll, auto-refresh after execution.
 */
export const HistoryPanel = () => {
  const {
    entries,
    isLoading,
    hasMore,
    search,
    methodFilter,
    statusFilter,
    fetchHistory,
    loadMore,
    setSearch,
    setMethodFilter,
    setStatusFilter,
    clearHistory,
  } = useHistoryStore();

  const { addTab } = useRequestStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showSaveMenu, setShowSaveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-refresh: track response count to detect new executions
  const responseCount = useRequestStore((s) =>
    s.tabs.reduce((acc, t) => acc + (t.response ? 1 : 0), 0),
  );
  const prevResponseCount = useRef(responseCount);

  useEffect(() => {
    if (responseCount > prevResponseCount.current) {
      // A new response appeared — refresh history after a short delay
      const timer = setTimeout(() => fetchHistory(), 800);
      prevResponseCount.current = responseCount;
      return () => clearTimeout(timer);
    }
    prevResponseCount.current = responseCount;
  }, [responseCount, fetchHistory]);

  // Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || isLoading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  // Toggle group collapse
  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  // Click to replay — populate a new tab with the request
  const handleReplay = useCallback(
    (entry: HistoryEntry) => {
      addTab();
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

  // Save history entry to collection (open the save modal with pre-filled data)
  const handleSaveToCollection = useCallback(
    (entry: HistoryEntry) => {
      // Add a tab with this request and then trigger save
      addTab();
      setTimeout(() => {
        const store = useRequestStore.getState();
        const newTab = store.tabs[store.tabs.length - 1];
        if (!newTab) return;
        store.updateMethod(entry.request.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS');
        store.updateUrl(entry.request.url);
        // Trigger save modal via keyboard shortcut simulation
        toast.success('Request loaded — use Ctrl+S to save to a collection');
      }, 50);
      setShowSaveMenu(null);
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

      {/* Search */}
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
      </div>

      {/* Method + Status filters */}
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={methodFilter || ''}
          onChange={(e) => setMethodFilter(e.target.value || null)}
        >
          {METHOD_FILTERS.map((f) => (
            <option key={f.label} value={f.value || ''}>{f.label}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
        >
          {STATUS_FILTERS.map((f) => (
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
          groups.map((group) => {
            const isCollapsed = collapsedGroups.has(group.label);
            return (
              <div key={group.label} className={styles.group}>
                <button
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(group.label)}
                  type="button"
                >
                  {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span>{group.label}</span>
                  <span className={styles.groupCount}>{group.entries.length}</span>
                </button>
                {!isCollapsed &&
                  group.entries.map((entry, idx) => (
                    <div
                      key={entry._id}
                      className={styles.entry}
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <button
                        className={styles.entryMain}
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
                        </div>
                      </button>
                      <div className={styles.entryActions}>
                        <span className={styles.entryTime}>{formatRelativeTime(entry.executedAt)}</span>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleSaveToCollection(entry)}
                          title="Save to Collection"
                          type="button"
                        >
                          <Save size={11} />
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleReplay(entry)}
                          title="Replay"
                          type="button"
                        >
                          <RotateCcw size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            );
          })
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
