import { Trash2 } from 'lucide-react';
import styles from './KeyValueEditor.module.css';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

/**
 * Reusable key-value pair editor.
 * Used for headers, params, and form-data.
 * Features: enable/disable toggle, auto-add empty row, delete with minimum 1 row.
 */
export const KeyValueEditor = ({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) => {
  const updatePair = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
    const updated = pairs.map((p) =>
      p.id === id ? { ...p, [field]: value } : p,
    );

    // Auto-add blank row when the last row has content
    const lastPair = updated[updated.length - 1];
    if (lastPair && (lastPair.key || lastPair.value)) {
      updated.push({
        id: crypto.randomUUID(),
        key: '',
        value: '',
        description: '',
        enabled: true,
      });
    }

    onChange(updated);
  };

  const deletePair = (id: string) => {
    if (pairs.length <= 1) return;
    onChange(pairs.filter((p) => p.id !== id));
  };

  return (
    <div className={styles.container}>
      {/* Column headers */}
      <div className={styles.header}>
        <span className={styles.headerCheck} />
        <span className={styles.headerKey}>{keyPlaceholder}</span>
        <span className={styles.headerValue}>{valuePlaceholder}</span>
        <span className={styles.headerDesc}>Description</span>
        <span className={styles.headerAction} />
      </div>

      {/* Rows */}
      {pairs.map((pair) => (
        <div
          key={pair.id}
          className={`${styles.row} ${!pair.enabled ? styles.disabled : ''}`}
        >
          <input
            type="checkbox"
            checked={pair.enabled}
            onChange={(e) => updatePair(pair.id, 'enabled', e.target.checked)}
            className={styles.checkbox}
          />
          <input
            className={styles.keyInput}
            value={pair.key}
            onChange={(e) => updatePair(pair.id, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            spellCheck={false}
          />
          <input
            className={styles.valueInput}
            value={pair.value}
            onChange={(e) => updatePair(pair.id, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            spellCheck={false}
          />
          <input
            className={styles.descInput}
            value={pair.description}
            onChange={(e) => updatePair(pair.id, 'description', e.target.value)}
            placeholder="Description"
          />
          <button
            className={styles.deleteBtn}
            onClick={() => deletePair(pair.id)}
            aria-label="Delete row"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
