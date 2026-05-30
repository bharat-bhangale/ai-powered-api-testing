import { useState } from 'react';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';
import { BodyEditor } from './BodyEditor';
import { AuthConfigPanel } from './AuthConfig';
import { TestEditor } from '@/components/test-runner/TestEditor';
import type { KeyValuePair, RequestBodyConfig, AuthConfig } from '@/stores/requestStore';
import styles from './RequestPanel.module.css';

type SubTab = 'params' | 'headers' | 'body' | 'auth' | 'tests';

interface RequestPanelProps {
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBodyConfig;
  auth: AuthConfig;
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
          <BodyEditor
            mode={body.mode}
            content={body.content}
            onModeChange={(mode) => onBodyChange({ ...body, mode: mode as RequestBodyConfig['mode'] })}
            onContentChange={(content) => onBodyChange({ ...body, content })}
          />
        )}

        {activeSubTab === 'auth' && (
          <AuthConfigPanel auth={auth} onChange={onAuthChange} />
        )}

        {activeSubTab === 'tests' && (
          <TestEditor />
        )}
      </div>
    </div>
  );
};

