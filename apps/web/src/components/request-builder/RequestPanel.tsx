import { useState } from 'react';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';
import { BodyEditor } from './BodyEditor';
import { AuthConfigPanel } from './AuthConfig';
import { TestEditor } from '@/components/test-runner/TestEditor';
import { useTestBuilderStore } from '@/stores/testBuilderStore';
import { DataGenerator } from '@/components/ai/DataGenerator';
import type { KeyValuePair, RequestBodyConfig, AuthConfig } from '@/stores/requestStore';
import styles from './RequestPanel.module.css';

type SubTab = 'params' | 'headers' | 'body' | 'auth' | 'tests';

interface RequestPanelProps {
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBodyConfig;
  auth: AuthConfig;
  method?: string;
  url?: string;
  onParamsChange: (params: KeyValuePair[]) => void;
  onHeadersChange: (headers: KeyValuePair[]) => void;
  onBodyChange: (body: RequestBodyConfig) => void;
  onAuthChange: (auth: AuthConfig) => void;
}

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'params', label: 'Params' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'auth', label: 'Auth' },
  { key: 'tests', label: 'Tests' },
];

/**
 * Request configuration panel with sub-tabs for Params, Headers, Body, Auth, Tests.
 */
export const RequestPanel = ({
  params,
  headers,
  body,
  auth,
  method = 'POST',
  url = '/',
  onParamsChange,
  onHeadersChange,
  onBodyChange,
  onAuthChange,
}: RequestPanelProps) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('params');

  // Count enabled params/headers for badge display
  const paramCount = params.filter((p) => p.enabled && p.key).length;
  const headerCount = headers.filter((h) => h.enabled && h.key).length;

  const getBadge = (tab: SubTab): number | null => {
    if (tab === 'params' && paramCount > 0) return paramCount;
    if (tab === 'headers' && headerCount > 0) return headerCount;
    return null;
  };

  return (
    <div className={styles.panel}>
      {/* Sub-tab bar */}
      <div className={styles.tabBar}>
        {SUB_TABS.map((tab) => {
          const badge = getBadge(tab.key);
          return (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeSubTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveSubTab(tab.key)}
              type="button"
            >
              {tab.label}
              {badge !== null && (
                <span className={styles.badge}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className={styles.content}>
        {activeSubTab === 'params' && (
          <KeyValueEditor
            pairs={params}
            onChange={onParamsChange}
            keyPlaceholder="Parameter"
            valuePlaceholder="Value"
          />
        )}

        {activeSubTab === 'headers' && (
          <KeyValueEditor
            pairs={headers}
            onChange={onHeadersChange}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
          />
        )}

        {activeSubTab === 'body' && (
          <BodyEditorWithDataGen
            body={body}
            method={method}
            url={url}
            onBodyChange={onBodyChange}
          />
        )}

        {activeSubTab === 'auth' && (
          <AuthConfigPanel auth={auth} onChange={onAuthChange} />
        )}

        {activeSubTab === 'tests' && (
          <TestEditorWithBuilder />
        )}
      </div>
    </div>
  );
};

/**
 * Wraps TestEditor with the AI Test Builder trigger button.
 */
const TestEditorWithBuilder = () => {
  const openPanel = useTestBuilderStore((s) => s.openPanel);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={openPanel}
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: 'linear-gradient(135deg, hsl(271, 76%, 53%), hsl(330, 80%, 55%))',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          ✨ AI Test Builder
        </button>
      </div>
      <TestEditor />
    </div>
  );
};

/**
 * Wraps BodyEditor with the AI Smart Data Generator trigger button.
 */
const BodyEditorWithDataGen = ({
  body,
  method,
  url,
  onBodyChange,
}: {
  body: RequestBodyConfig;
  method: string;
  url: string;
  onBodyChange: (body: RequestBodyConfig) => void;
}) => {
  const [showDataGen, setShowDataGen] = useState(false);
  const isJson = body.mode === 'json' || body.mode === 'raw';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {/* 🎲 button — only shown for JSON/raw body modes */}
      {isJson && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowDataGen(true)}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              background: 'linear-gradient(135deg, hsl(280, 80%, 60%), hsl(320, 75%, 55%))',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
            }}
          >
            🎲 Generate Smart Data
          </button>
        </div>
      )}
      <BodyEditor
        mode={body.mode}
        content={body.content}
        onModeChange={(mode) => onBodyChange({ ...body, mode: mode as RequestBodyConfig['mode'] })}
        onContentChange={(content) => onBodyChange({ ...body, content })}
      />
      <DataGenerator
        isOpen={showDataGen}
        method={method}
        url={url}
        currentBody={body.content}
        onApply={(json) => onBodyChange({ ...body, content: json })}
        onClose={() => setShowDataGen(false)}
      />
    </div>
  );
};
