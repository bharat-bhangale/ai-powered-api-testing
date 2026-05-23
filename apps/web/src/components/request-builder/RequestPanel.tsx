import { useState } from 'react';
import { KeyValueEditor } from '@/components/common/KeyValueEditor';
import { BodyEditor } from './BodyEditor';
import type { KeyValuePair, RequestBodyConfig, AuthConfig } from '@/stores/requestStore';
import styles from './RequestPanel.module.css';

type SubTab = 'params' | 'headers' | 'body' | 'auth';

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
];

/**
 * Request configuration panel with sub-tabs for Params, Headers, Body, Auth.
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
          <AuthEditor auth={auth} onChange={onAuthChange} />
        )}
      </div>
    </div>
  );
};

/* ===== Auth Editor (inline) ===== */

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { value: AuthConfig['type']; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'apikey', label: 'API Key' },
];

const AuthEditor = ({ auth, onChange }: AuthEditorProps) => {
  return (
    <div className={styles.authEditor}>
      <div className={styles.authTypeSelector}>
        {AUTH_TYPES.map((type) => (
          <label
            key={type.value}
            className={`${styles.authTypeOption} ${auth.type === type.value ? styles.authTypeActive : ''}`}
          >
            <input
              type="radio"
              name="authType"
              value={type.value}
              checked={auth.type === type.value}
              onChange={() => onChange({ ...auth, type: type.value })}
            />
            <span>{type.label}</span>
          </label>
        ))}
      </div>

      {auth.type === 'none' && (
        <div className={styles.authNone}>
          This request does not use any authorization
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className={styles.authFields}>
          <label className={styles.fieldLabel}>Token</label>
          <input
            className={styles.fieldInput}
            type="text"
            value={auth.bearer?.token || ''}
            onChange={(e) =>
              onChange({ ...auth, bearer: { token: e.target.value } })
            }
            placeholder="Enter bearer token"
            spellCheck={false}
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className={styles.authFields}>
          <label className={styles.fieldLabel}>Username</label>
          <input
            className={styles.fieldInput}
            type="text"
            value={auth.basic?.username || ''}
            onChange={(e) =>
              onChange({
                ...auth,
                basic: { username: e.target.value, password: auth.basic?.password || '' },
              })
            }
            placeholder="Username"
            spellCheck={false}
          />
          <label className={styles.fieldLabel}>Password</label>
          <input
            className={styles.fieldInput}
            type="password"
            value={auth.basic?.password || ''}
            onChange={(e) =>
              onChange({
                ...auth,
                basic: { username: auth.basic?.username || '', password: e.target.value },
              })
            }
            placeholder="Password"
          />
        </div>
      )}

      {auth.type === 'apikey' && (
        <div className={styles.authFields}>
          <label className={styles.fieldLabel}>Key</label>
          <input
            className={styles.fieldInput}
            type="text"
            value={auth.apiKey?.key || ''}
            onChange={(e) =>
              onChange({
                ...auth,
                apiKey: {
                  key: e.target.value,
                  value: auth.apiKey?.value || '',
                  addTo: auth.apiKey?.addTo || 'header',
                },
              })
            }
            placeholder="Key name"
            spellCheck={false}
          />
          <label className={styles.fieldLabel}>Value</label>
          <input
            className={styles.fieldInput}
            type="text"
            value={auth.apiKey?.value || ''}
            onChange={(e) =>
              onChange({
                ...auth,
                apiKey: {
                  key: auth.apiKey?.key || '',
                  value: e.target.value,
                  addTo: auth.apiKey?.addTo || 'header',
                },
              })
            }
            placeholder="Key value"
            spellCheck={false}
          />
          <label className={styles.fieldLabel}>Add to</label>
          <select
            className={styles.fieldInput}
            value={auth.apiKey?.addTo || 'header'}
            onChange={(e) =>
              onChange({
                ...auth,
                apiKey: {
                  key: auth.apiKey?.key || '',
                  value: auth.apiKey?.value || '',
                  addTo: e.target.value as 'header' | 'query',
                },
              })
            }
          >
            <option value="header">Header</option>
            <option value="query">Query Params</option>
          </select>
        </div>
      )}
    </div>
  );
};
