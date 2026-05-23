import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useCollectionStore } from '@/stores/collectionStore';
import styles from './CreateCollectionModal.module.css';

interface CreateCollectionModalProps {
  onClose: () => void;
}

/**
 * Modal for creating a new collection.
 */
export const CreateCollectionModal = ({ onClose }: CreateCollectionModalProps) => {
  const createCollection = useCollectionStore((s) => s.createCollection);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      await createCollection(name.trim(), description.trim());
      onClose();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to create collection');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>New Collection</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="collection-name" className={styles.label}>
              Name
            </label>
            <input
              id="collection-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Collection"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="collection-desc" className={styles.label}>
              Description <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="collection-desc"
              className={styles.input}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description..."
            />
          </div>

          <div className={styles.actions}>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className={styles.createBtn}
              type="submit"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
