import { useEffect, useState } from 'react';
import { FolderPlus, LogOut, Settings } from 'lucide-react';
import { useCollectionStore } from '@/stores/collectionStore';
import { useAuthStore } from '@/stores/authStore';
import { CollectionTree } from './CollectionTree';
import { CreateCollectionModal } from './CreateCollectionModal';
import styles from './Sidebar.module.css';

/**
 * Sidebar — fixed left panel showing collections tree.
 * Header: "Collections" title + create button
 * Body: scrollable collection tree
 * Footer: user info + logout
 */
export const Sidebar = () => {
  const { collections, isLoading, fetchCollections } = useCollectionStore();
  const { user, logout } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <aside className={styles.sidebar}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>Collections</h2>
        <button
          className={styles.addButton}
          onClick={() => setShowCreateModal(true)}
          title="New Collection"
          type="button"
        >
          <FolderPlus size={16} />
        </button>
      </div>

      {/* Tree content */}
      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
            <div className={styles.skeletonLine} style={{ width: '80%' }} />
          </div>
        ) : collections.length === 0 ? (
          <div className={styles.empty}>
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

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal onClose={() => setShowCreateModal(false)} />
      )}
    </aside>
  );
};
