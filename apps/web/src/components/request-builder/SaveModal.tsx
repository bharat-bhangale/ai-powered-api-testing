import { useState, useEffect, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useCollectionStore } from '@/stores/collectionStore';
import { useRequestStore } from '@/stores/requestStore';
import { apiClient } from '@/services/api';
import styles from './SaveModal.module.css';

interface SaveModalProps {
  onClose: () => void;
}

/**
 * Save-to-collection modal.
 * Select collection + optional folder, name the request, then save.
 */
export const SaveModal = ({ onClose }: SaveModalProps) => {
  const { collections, fetchCollections } = useCollectionStore();
  const { tabs, activeTabId, markSaved } = useRequestStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [name, setName] = useState(activeTab?.name || 'Untitled Request');
  const [collectionId, setCollectionId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (collections.length > 0 && !collectionId) {
      setCollectionId(collections[0]?._id ?? '');
    }
  }, [collections, collectionId]);

  const selectedCollection = collections.find((c) => c._id === collectionId);

  if (!activeTab) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !collectionId) return;

    setIsLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        collectionId,
        folderId: folderId || undefined,
        method: activeTab.method,
        url: activeTab.url,
        headers: activeTab.headers.filter((h) => h.key),
        params: activeTab.params.filter((p) => p.key),
        body: activeTab.body,
        auth: activeTab.auth,
      };

      const res = await apiClient.post('/api/requests', payload);
      const savedRequest = res.data.data.request;

      // Mark the tab as saved
      markSaved(activeTab.id, savedRequest._id, collectionId);

      // Refresh collections to show the new request
      await fetchCollections();

      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to save request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Save Request</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="save-name" className={styles.label}>
              Request Name
            </label>
            <input
              id="save-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Get All Users"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="save-collection" className={styles.label}>
              Collection
            </label>
            {collections.length === 0 ? (
              <p className={styles.noCollections}>
                No collections yet. Create one first.
              </p>
            ) : (
              <select
                id="save-collection"
                className={styles.select}
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  setFolderId('');
                }}
              >
                {collections.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCollection && selectedCollection.folders.length > 0 && (
            <div className={styles.field}>
              <label htmlFor="save-folder" className={styles.label}>
                Folder <span className={styles.optional}>(optional)</span>
              </label>
              <select
                id="save-folder"
                className={styles.select}
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">Root (no folder)</option>
                {selectedCollection.folders.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.saveBtn}
              type="submit"
              disabled={isLoading || !name.trim() || !collectionId}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
