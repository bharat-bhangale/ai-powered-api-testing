import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileJson, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { useCollectionStore } from '@/stores/collectionStore';
import { isDesktopRuntime, showDesktopOpenDialog } from '@/services/desktop.service';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  onClose: () => void;
}

interface PreviewData {
  name: string;
  requestCount: number;
  folderCount: number;
}

/**
 * Import Modal — file upload for Postman Collection v2.1 JSON.
 * Shows preview with collection name, request/folder counts, then imports.
 */
export const ImportModal = ({ onClose }: ImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [rawJson, setRawJson] = useState<unknown>(null);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchCollections } = useCollectionStore();

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    setPreview(null);

    try {
      const text = await selectedFile.text();
      const json = JSON.parse(text);

      if (!json.info || !json.item) {
        setError('Invalid Postman collection format. Expected v2.1 JSON with "info" and "item" fields.');
        return;
      }

      // Count requests and folders recursively
      let requestCount = 0;
      let folderCount = 0;

      function countItems(items: Array<{ item?: unknown[]; request?: unknown }>): void {
        items.forEach((item) => {
          if (item.item && Array.isArray(item.item)) {
            folderCount++;
            countItems(item.item as Array<{ item?: unknown[]; request?: unknown }>);
          } else if (item.request) {
            requestCount++;
          }
        });
      }

      countItems(json.item);

      setRawJson(json);
      setPreview({
        name: json.info.name || 'Unnamed Collection',
        requestCount,
        folderCount,
      });
    } catch {
      setError('Failed to parse file. Ensure it is a valid JSON file.');
    }
  }, []);

  const handleDesktopFileSelect = useCallback(async () => {
    try {
      const result = await showDesktopOpenDialog({
        title: 'Import Postman Collection',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      });

      if (!result) return; // Cancelled

      const { content, fileName } = result;
      // Mock a file object for the UI display
      setFile(new File([content], fileName, { type: 'application/json' }));
      setError('');
      setPreview(null);

      const json = JSON.parse(content);
      if (!json.info || !json.item) {
        setError('Invalid Postman collection format. Expected v2.1 JSON with "info" and "item" fields.');
        return;
      }

      let requestCount = 0;
      let folderCount = 0;

      function countItems(items: Array<{ item?: unknown[]; request?: unknown }>): void {
        items.forEach((item) => {
          if (item.item && Array.isArray(item.item)) {
            folderCount++;
            countItems(item.item as Array<{ item?: unknown[]; request?: unknown }>);
          } else if (item.request) {
            requestCount++;
          }
        });
      }

      countItems(json.item);
      setRawJson(json);
      setPreview({
        name: json.info.name || 'Unnamed Collection',
        requestCount,
        folderCount,
      });
    } catch {
      setError('Failed to parse file. Ensure it is a valid JSON file.');
    }
  }, []);

  // Import
  const handleImport = useCallback(async () => {
    if (!rawJson) return;
    setIsImporting(true);

    try {
      await apiClient.post('/api/import/postman', { collection: rawJson });
      await fetchCollections();
      toast.success('Collection imported successfully');
      onClose();
    } catch {
      toast.error('Failed to import collection');
    }

    setIsImporting(false);
  }, [rawJson, fetchCollections, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Upload size={16} />
            Import Collection
          </h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Drop zone / file input */}
          <div
            className={styles.dropZone}
            onClick={() => {
              if (isDesktopRuntime()) {
                handleDesktopFileSelect();
              } else {
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isDesktopRuntime()) return; // Native handles its own files
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) handleFileSelect(droppedFile);
            }}
          >
            <FileJson size={32} className={styles.dropIcon} />
            <p className={styles.dropText}>
              {file ? file.name : (isDesktopRuntime() ? 'Click to browse Postman Collection JSON' : 'Click or drag a Postman Collection JSON file')}
            </p>
            <span className={styles.dropHint}>Supports Postman Collection v2.1</span>
            
            {!isDesktopRuntime() && (
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className={styles.fileInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className={styles.preview}>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>Collection</span>
                <span className={styles.previewValue}>{preview.name}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>Requests</span>
                <span className={styles.previewValue}>{preview.requestCount}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>Folders</span>
                <span className={styles.previewValue}>{preview.folderCount}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={styles.importBtn}
            onClick={handleImport}
            disabled={!preview || isImporting}
            type="button"
          >
            {isImporting ? 'Importing...' : (
              <>
                <Check size={14} />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
