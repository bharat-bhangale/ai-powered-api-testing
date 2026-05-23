import { X, Plus } from 'lucide-react';
import { useRequestStore } from '@/stores/requestStore';
import styles from './RequestTabs.module.css';

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  PATCH: 'var(--color-method-patch)',
  DELETE: 'var(--color-method-delete)',
  HEAD: 'var(--color-method-head)',
  OPTIONS: 'var(--color-method-options)',
};

/**
 * Browser-style request tab bar.
 * Shows: method dot + tab name, close button on hover, + button at end.
 */
export const RequestTabs = () => {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useRequestStore();

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  return (
    <div className={styles.tabBar}>
      <div className={styles.tabList}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            title={tab.url || tab.name}
          >
            {/* Method color dot */}
            <span
              className={styles.methodDot}
              style={{ backgroundColor: METHOD_COLORS[tab.method] || 'var(--color-text-tertiary)' }}
            />

            {/* Tab name */}
            <span className={styles.tabName}>
              {tab.url
                ? tab.url.replace(/^https?:\/\//, '').substring(0, 30)
                : tab.name}
            </span>

            {/* Dirty indicator */}
            {tab.isDirty && <span className={styles.dirtyDot} />}

            {/* Close button */}
            <span
              className={styles.closeBtn}
              onClick={(e) => handleClose(e, tab.id)}
              role="button"
              aria-label="Close tab"
            >
              <X size={12} />
            </span>
          </button>
        ))}
      </div>

      {/* Add new tab */}
      <button
        id="new-tab-button"
        className={styles.addBtn}
        onClick={addTab}
        aria-label="New tab"
        type="button"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
