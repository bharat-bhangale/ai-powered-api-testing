import { useEffect, useState } from 'react';
import { FolderPlus, LogOut, Settings, Clock, Download, Layers } from 'lucide-react';
import { useCollectionStore } from '@/stores/collectionStore';
import { useAuthStore } from '@/stores/authStore';
import { CollectionTree } from './CollectionTree';
import { CreateCollectionModal } from './CreateCollectionModal';
import { HistoryPanel } from '@/components/history/HistoryPanel';
import { ImportModal } from '@/components/import/ImportModal';
import styles from './Sidebar.module.css';

type SidebarView = 'collections' | 'history';

/**
 * Sidebar — fixed left panel with tabs for Collections and History.
 * Header: view toggle + actions
 * Body: CollectionTree or HistoryPanel
 * Footer: user info + logout
 */
export const Sidebar = () => {
  const { collections, isLoading, fetchCollections } = useCollectionStore();
  const { user, logout } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>('collections');

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside className={styles.sidebar}>
      {/* View toggle tabs */}
      <div className={styles.viewTabs}>
        <button
          className={`${styles.viewTab} ${activeView === 'collections' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveView('collections')}
          type="button"
          title="Collections"
        >
          <Layers size={14} />
          <span>Collections</span>
        </button>
        <button
          className={`${styles.viewTab} ${activeView === 'history' ? styles.viewTabActive : ''}`}
          onClick={() => setActiveView('history')}
          type="button"
          title="History"
        >
          <Clock size={14} />
          <span>History</span>
        </button>
      </div>

      {/* Header with actions */}
      {activeView === 'collections' && (
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Collections</h2>
          <div className={styles.headerActions}>
            <button
              className={styles.addButton}
              onClick={() => setShowImportModal(true)}
              title="Import Collection"
              type="button"
            >
              <Download size={14} />
            </button>
            <button
              className={styles.addButton}
              onClick={() => setShowCreateModal(true)}
              title="New Collection"
              type="button"
            >
              <FolderPlus size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {activeView === 'collections' ? (
          isLoading ? (
            <div className={styles.loading}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} style={{ width: '60%' }} />
              <div className={styles.skeletonLine} style={{ width: '80%' }} />
            </div>
          ) : collections.length === 0 ? (
            <div className={styles.empty}>
              <Layers size={28} />
              <p>No collections yet</p>
              <button
                className={styles.emptyButton}
                onClick={() => setShowCreateModal(true)}
                type="button"
              >
                Create your first collection
              </button>
            </div>
          ) : (
            <CollectionTree />
          )
        ) : (
          <HistoryPanel />
        )}
      </div>

      {/* Footer: user info */}
      {user && (
        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className={styles.userName}>{user.name}</span>
          </div>
          <div className={styles.footerActions}>
            <button
              className={styles.footerButton}
              title="Settings"
              type="button"
            >
              <Settings size={14} />
            </button>
            <button
              className={styles.footerButton}
              onClick={handleLogout}
              title="Logout"
              type="button"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateCollectionModal onClose={() => setShowCreateModal(false)} />
      )}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}
    </aside>
  );
};
