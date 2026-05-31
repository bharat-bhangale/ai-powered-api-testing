import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { FlaskConical, Code2 } from 'lucide-react';
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

const PLACEHOLDER_PRE_REQUEST = `// Set dynamic variables
atx.variables.set('timestamp', atx.timestamp().toString());

// Generate signatures
const sig = atx.crypto.hmacSHA256('data', 'secret');
atx.variables.set('signature', sig);

// Generate UUIDs
atx.variables.set('requestId', atx.uuid());`;

/**
 * TestEditor — Monaco editor for writing test scripts.
 * Appears as a tab in the request panel alongside Params/Headers/Body/Auth.
 * Stores content per-tab in testRunnerStore.
 */
export const TestEditor = () => {
  const activeTabId = useRequestStore((s) => s.activeTabId);
  const [editorTab, setEditorTab] = useState<'tests' | 'pre-request'>('tests');

  const testScript = useTestRunnerStore((s) => (activeTabId ? s.scripts[activeTabId] : ''));
  const preRequestScript = useTestRunnerStore((s) => (activeTabId ? s.preRequestScripts[activeTabId] : ''));
  
  const setTestScript = useTestRunnerStore((s) => s.setScript);
  const setPreRequestScript = useTestRunnerStore((s) => s.setPreRequestScript);

  const handleChange = (value: string | undefined) => {
    if (!activeTabId) return;
    if (editorTab === 'tests') {
      setTestScript(activeTabId, value || '');
    } else {
      setPreRequestScript(activeTabId, value || '');
    }
  };

  if (!activeTabId) return null;

  const currentScript = editorTab === 'tests' ? testScript : preRequestScript;
  const isTests = editorTab === 'tests';

  return (
    <div className={styles.container}>
      <div className={styles.tabHeader}>
        <button 
          className={`${styles.tabBtn} ${isTests ? styles.active : ''}`}
          onClick={() => setEditorTab('tests')}
        >
          <FlaskConical size={14} />
          Tests
        </button>
        <button 
          className={`${styles.tabBtn} ${!isTests ? styles.active : ''}`}
          onClick={() => setEditorTab('pre-request')}
        >
          <Code2 size={14} />
          Pre-request
        </button>
      </div>

      {!currentScript ? (
        <div className={styles.placeholder}>
          {isTests ? (
            <>
              <FlaskConical size={24} className={styles.placeholderIcon} />
              <span>Write test assertions using the atx API</span>
              <code className={styles.placeholderCode}>{PLACEHOLDER_SCRIPT}</code>
            </>
          ) : (
            <>
              <Code2 size={24} className={styles.placeholderIcon} />
              <span>Run scripts before the request is executed</span>
              <code className={styles.placeholderCode}>{PLACEHOLDER_PRE_REQUEST}</code>
            </>
          )}
        </div>
      ) : null}
      <div className={styles.editorWrapper} style={{ display: currentScript || currentScript === '' ? 'block' : 'none' }}>
        <Editor
          height="200px"
          language="javascript"
          value={currentScript}
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
            placeholder: isTests 
              ? 'Write your test script here using atx.test() and atx.expect()...'
              : 'Write pre-request scripts here to set variables or generate signatures...',
          }}
          loading={
            <div style={{ padding: 16, color: 'var(--color-text-tertiary)' }}>Loading editor...</div>
          }
        />
      </div>
    </div>
  );
};
