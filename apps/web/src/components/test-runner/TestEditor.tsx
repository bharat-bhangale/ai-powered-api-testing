import Editor from '@monaco-editor/react';
import { FlaskConical } from 'lucide-react';
import { useTestRunnerStore } from '@/stores/testRunnerStore';
import { useRequestStore } from '@/stores/requestStore';
import styles from './TestEditor.module.css';

const PLACEHOLDER_SCRIPT = `atx.test("Status code is 200", () => {
  atx.expect(atx.response.status).toBe(200);
});

atx.test("Response is JSON", () => {
  const body = atx.response.json();
  atx.expect(body).toBeObject();
});`;

/**
 * TestEditor — Monaco editor for writing test scripts.
 * Appears as a tab in the request panel alongside Params/Headers/Body/Auth.
 * Stores content per-tab in testRunnerStore.
 */
export const TestEditor = () => {
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const script = useTestRunnerStore((s) => (activeTabId ? s.scripts[activeTabId] : ''));
  const setScript = useTestRunnerStore((s) => s.setScript);

  const handleChange = (value: string | undefined) => {
    if (activeTabId) {
      setScript(activeTabId, value || '');
    }
  };

  if (!activeTabId) return null;

  return (
    <div className={styles.container}>
      {!script ? (
        <div className={styles.placeholder}>
          <FlaskConical size={24} className={styles.placeholderIcon} />
          <span>Write test assertions using the atx API</span>
          <code className={styles.placeholderCode}>{PLACEHOLDER_SCRIPT}</code>
        </div>
      ) : null}
      <div className={styles.editorWrapper} style={{ display: script || script === '' ? 'block' : 'none' }}>
        <Editor
          height="200px"
          language="javascript"
          value={script}
          onChange={handleChange}
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
            placeholder: 'Write your test script here using atx.test() and atx.expect()...',
          }}
          loading={
            <div style={{ padding: 16, color: 'var(--color-text-tertiary)' }}>Loading editor...</div>
          }
        />
      </div>
    </div>
  );
};
