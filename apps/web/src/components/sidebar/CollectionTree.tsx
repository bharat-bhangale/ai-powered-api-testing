import { ChevronRight, ChevronDown, Folder, FolderOpen, Trash2 } from 'lucide-react';
import { useCollectionStore } from '@/stores/collectionStore';
import { useRequestStore } from '@/stores/requestStore';
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

/**
 * CollectionTree — recursive tree rendering collections → folders → requests.
 */
export const CollectionTree = () => {
  const { collections, expandedIds, toggleExpanded, deleteCollection } =
    useCollectionStore();

  return (
    <div className={styles.tree}>
      {collections.map((collection) => {
        const isExpanded = expandedIds.has(collection._id);
        const rootRequests = collection.requests.filter(
          (r) => !r.folderId,
        );

        return (
          <div key={collection._id} className={styles.collectionItem}>
            {/* Collection row */}
            <div
              className={styles.row}
              onClick={() => toggleExpanded(collection._id)}
            >
              <span className={styles.chevron}>
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </span>
              <span className={styles.folderIcon}>
                {isExpanded ? (
                  <FolderOpen size={14} />
                ) : (
                  <Folder size={14} />
                )}
              </span>
              <span className={styles.itemName}>{collection.name}</span>
              <span className={styles.count}>
                {collection.requests.length}
              </span>
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${collection.name}" and all its requests?`)) {
                    deleteCollection(collection._id);
                  }
                }}
                title="Delete collection"
                type="button"
              >
                <Trash2 size={12} />
              </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className={styles.children}>
                {/* Folders */}
                {collection.folders.map((folder) => {
                  const folderRequests = collection.requests.filter(
                    (r) => r.folderId === folder._id,
                  );
                  const isFolderExpanded = expandedIds.has(folder._id);

                  return (
                    <div key={folder._id}>
                      <div
                        className={`${styles.row} ${styles.folderRow}`}
                        onClick={() => toggleExpanded(folder._id)}
                      >
                        <span className={styles.chevron}>
                          {isFolderExpanded ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                        </span>
                        <span className={styles.folderIcon}>
                          {isFolderExpanded ? (
                            <FolderOpen size={13} />
                          ) : (
                            <Folder size={13} />
                          )}
                        </span>
                        <span className={styles.itemName}>{folder.name}</span>
                        <span className={styles.count}>
                          {folderRequests.length}
                        </span>
                      </div>

                      {isFolderExpanded && (
                        <div className={styles.children}>
                          {folderRequests.map((request) => (
                            <RequestRow key={request._id} request={request} depth={2} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Root-level requests (no folder) */}
                {rootRequests.map((request) => (
                  <RequestRow key={request._id} request={request} depth={1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
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
}

const RequestRow = ({ request, depth }: RequestRowProps) => {
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
      className={`${styles.row} ${styles.requestRow}`}
      style={{ paddingLeft: `${16 + depth * 16}px` }}
      onClick={handleClick}
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
