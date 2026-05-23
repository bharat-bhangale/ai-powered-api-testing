import Editor from '@monaco-editor/react';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';
import type { KeyValuePair } from '@/components/common/KeyValueEditor';
import styles from './BodyEditor.module.css';

interface BodyEditorProps {
  mode: string;
  content: string;
  onModeChange: (mode: string) => void;
  onContentChange: (content: string) => void;
}

const BODY_MODES = [
  { value: 'none', label: 'none' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'urlencoded', label: 'x-www-form-urlencoded' },
];

/**
 * Request body editor with mode selector.
 * Shows Monaco for JSON/Raw, KeyValueEditor for form data modes.
 */
export const BodyEditor = ({
  mode,
  content,
  onModeChange,
  onContentChange,
}: BodyEditorProps) => {
  const getLanguage = () => {
    switch (mode) {
      case 'json': return 'json';
      case 'raw': return 'plaintext';
      default: return 'plaintext';
    }
  };

  // Parse form data from content string (stored as JSON array)
  const getFormPairs = (): KeyValuePair[] => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
    return [{ id: crypto.randomUUID(), key: '', value: '', description: '', enabled: true }];
  };

  const handleFormChange = (pairs: KeyValuePair[]) => {
    onContentChange(JSON.stringify(pairs));
  };

  return (
    <div className={styles.container}>
      {/* Mode selector radio buttons */}
      <div className={styles.modeSelector}>
        {BODY_MODES.map((m) => (
          <label
            key={m.value}
            className={`${styles.modeOption} ${mode === m.value ? styles.modeActive : ''}`}
          >
            <input
              type="radio"
              name="bodyMode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => onModeChange(m.value)}
              className={styles.modeRadio}
            />
            <span>{m.label}</span>
          </label>
        ))}
      </div>

      {/* Content area based on mode */}
      {mode === 'none' && (
        <div className={styles.noBody}>
          This request does not have a body
        </div>
      )}

      {(mode === 'json' || mode === 'raw') && (
        <div className={styles.editorWrapper}>
          <Editor
            height="200px"
            language={getLanguage()}
            value={content}
            onChange={(value) => onContentChange(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 8 },
              renderLineHighlight: 'none',
              scrollbar: { verticalScrollbarSize: 8 },
            }}
            loading={
              <div className={styles.editorLoading}>Loading editor...</div>
            }
          />
        </div>
      )}

      {(mode === 'form-data' || mode === 'urlencoded') && (
        <div className={styles.formWrapper}>
          <KeyValueEditor
            pairs={getFormPairs()}
            onChange={handleFormChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        </div>
      )}
    </div>
  );
};
