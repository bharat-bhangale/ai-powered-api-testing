import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { useCollectionStore } from '@/stores/collectionStore';
import { useRequestStore } from '@/stores/requestStore';
import { apiClient } from '@/services/api';
import {
  ContextMenu,
  COLLECTION_MENU_ITEMS,
  FOLDER_MENU_ITEMS,
  REQUEST_MENU_ITEMS,
  type ContextMenuAction,
} from './ContextMenu';
import styles from './CollectionTree.module.css';

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  PATCH: 'var(--color-method-patch)',
  DELETE: 'var(--color-method-delete)',
  HEAD: 'var(--color-method-head)',
  OPTIONS: 'var(--color-method-options)',
};

interface ContextMenuState {
  x: number;
  y: number;
  type: 'collection' | 'folder' | 'request';
  targetId: string;
  collectionId: string;
}

/**
 * CollectionTree — recursive tree rendering collections → folders → requests.
 * Supports: expand/collapse, method badges, click-to-load, right-click context menu,
 * active request highlighting, inline rename.
 */
export const CollectionTree = () => {
  const { collections, expandedIds, toggleExpanded, deleteCollection, addFolder, fetchCollections } =
    useCollectionStore();
  const { tabs, activeTabId } = useRequestStore();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  // Find the active tab's savedRequestId for highlighting
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeSavedRequestId = activeTab?.savedRequestId;

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: ContextMenuState['type'], targetId: string, collectionId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, type, targetId, collectionId });
    },
    [],
  );

  const handleContextAction = useCallback(
    async (action: ContextMenuAction) => {
      if (!contextMenu) return;
      const { type, targetId, collectionId } = contextMenu;

      switch (action) {
        case 'rename':
          // Find current name
          if (type === 'collection') {
            const col = collections.find((c) => c._id === targetId);
            setRenaming({ id: targetId, name: col?.name || '' });
          } else if (type === 'folder') {
            const col = collections.find((c) => c._id === collectionId);
            const folder = col?.folders.find((f) => f._id === targetId);
            setRenaming({ id: targetId, name: folder?.name || '' });
          }
          break;

        case 'delete':
          if (type === 'collection') {
            if (confirm('Delete this collection and all its requests?')) {
              await deleteCollection(targetId);
            }
          } else if (type === 'folder') {
            try {
              await apiClient.delete(`/api/collections/${collectionId}/folders/${targetId}`);
              await fetchCollections();
            } catch { /* ignore */ }
          } else if (type === 'request') {
            try {
              await apiClient.delete(`/api/requests/${targetId}`);
              await fetchCollections();
            } catch { /* ignore */ }
          }
          break;

        case 'duplicate':
          if (type === 'request') {
            try {
              await apiClient.post(`/api/requests/${targetId}/duplicate`);
              await fetchCollections();
            } catch { /* ignore */ }
          }
          break;

        case 'addFolder': {
          const name = prompt('Folder name:');
          if (name) {
            await addFolder(collectionId, name);
          }
          break;
        }
      }
    },
    [contextMenu, collections, deleteCollection, addFolder, fetchCollections],
  );

  const handleRenameSubmit = useCallback(
    async (newName: string, type: 'collection' | 'folder', targetId: string, collectionId?: string) => {
      if (!newName.trim()) {
        setRenaming(null);
        return;
      }
      try {
        if (type === 'collection') {
          await apiClient.patch(`/api/collections/${targetId}`, { name: newName.trim() });
        } else if (type === 'folder' && collectionId) {
          await apiClient.patch(`/api/collections/${collectionId}/folders/${targetId}`, { name: newName.trim() });
        }
        await fetchCollections();
      } catch { /* ignore */ }
      setRenaming(null);
    },
    [fetchCollections],
  );

  return (
    <div className={styles.tree}>
      {collections.map((collection) => {
        const isExpanded = expandedIds.has(collection._id);
        const rootRequests = collection.requests.filter((r) => !r.folderId);

        return (
          <div key={collection._id} className={styles.collectionItem}>
            {/* Collection row */}
            <div
              className={styles.row}
              onClick={() => toggleExpanded(collection._id)}
              onContextMenu={(e) => handleContextMenu(e, 'collection', collection._id, collection._id)}
            >
              <span className={styles.chevron}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className={styles.folderIcon}>
                {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
              </span>

              {renaming?.id === collection._id ? (
                <input
                  className={styles.renameInput}
                  autoFocus
                  defaultValue={renaming.name}
                  onBlur={(e) => handleRenameSubmit(e.target.value, 'collection', collection._id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit((e.target as HTMLInputElement).value, 'collection', collection._id);
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.itemName}>{collection.name}</span>
              )}

              <span className={styles.count}>{collection.requests.length}</span>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className={styles.children}>
                {/* Folders */}
                {collection.folders.map((folder) => {
                  const folderRequests = collection.requests.filter((r) => r.folderId === folder._id);
                  const isFolderExpanded = expandedIds.has(folder._id);

                  return (
                    <div key={folder._id}>
                      <div
                        className={`${styles.row} ${styles.folderRow}`}
                        onClick={() => toggleExpanded(folder._id)}
                        onContextMenu={(e) => handleContextMenu(e, 'folder', folder._id, collection._id)}
                      >
                        <span className={styles.chevron}>
                          {isFolderExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                        <span className={styles.folderIcon}>
                          {isFolderExpanded ? <FolderOpen size={13} /> : <Folder size={13} />}
                        </span>

                        {renaming?.id === folder._id ? (
                          <input
                            className={styles.renameInput}
                            autoFocus
                            defaultValue={renaming.name}
                            onBlur={(e) => handleRenameSubmit(e.target.value, 'folder', folder._id, collection._id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSubmit((e.target as HTMLInputElement).value, 'folder', folder._id, collection._id);
                              if (e.key === 'Escape') setRenaming(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className={styles.itemName}>{folder.name}</span>
                        )}

                        <span className={styles.count}>{folderRequests.length}</span>
                      </div>

                      {isFolderExpanded && (
                        <div className={styles.children}>
                          {folderRequests.map((request) => (
                            <RequestRow
                              key={request._id}
                              request={request}
                              depth={2}
                              isActive={activeSavedRequestId === request._id}
                              onContextMenu={(e) => handleContextMenu(e, 'request', request._id, collection._id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Root-level requests (no folder) */}
                {rootRequests.map((request) => (
                  <RequestRow
                    key={request._id}
                    request={request}
                    depth={1}
                    isActive={activeSavedRequestId === request._id}
                    onContextMenu={(e) => handleContextMenu(e, 'request', request._id, collection._id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={
            contextMenu.type === 'collection'
              ? COLLECTION_MENU_ITEMS
              : contextMenu.type === 'folder'
                ? FOLDER_MENU_ITEMS
                : REQUEST_MENU_ITEMS
          }
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

/* ===== Request Row Component ===== */

interface RequestRowProps {
  request: {
    _id: string;
    name: string;
    method: string;
    url: string;
    collectionId: string;
    folderId: string | null;
  };
  depth: number;
  isActive: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
}

const RequestRow = ({ request, depth, isActive, onContextMenu }: RequestRowProps) => {
  const { loadSavedRequest } = useRequestStore();

  const handleClick = () => {
    loadSavedRequest({
      _id: request._id,
      name: request.name,
      method: request.method,
      url: request.url,
      collectionId: request.collectionId,
      folderId: request.folderId,
    });
  };

  return (
    <div
      className={`${styles.row} ${styles.requestRow} ${isActive ? styles.requestActive : ''}`}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      title={request.url}
    >
      <span
        className={styles.methodBadge}
        style={{ color: METHOD_COLORS[request.method] || 'var(--color-text-tertiary)' }}
      >
        {request.method}
      </span>
      <span className={styles.requestName}>{request.name}</span>
    </div>
  );
};
