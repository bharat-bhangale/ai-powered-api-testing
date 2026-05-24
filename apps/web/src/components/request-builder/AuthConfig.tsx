import { useState, useMemo } from 'react';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { VariableInput } from '@/components/common/VariableInput';
import type { AuthConfig } from '@/stores/requestStore';
import styles from './AuthConfig.module.css';

interface AuthConfigProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

const AUTH_TYPES: { value: AuthConfig['type']; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'apikey', label: 'API Key' },
];

/**
 * Auth configuration panel — tab in the request builder.
 * Supports None, API Key, Bearer Token, Basic Auth with {{variable}} inputs.
 * Shows preview of the generated Authorization header.
 */
export const AuthConfigPanel = ({ auth, onChange }: AuthConfigProps) => {
  const [showPassword, setShowPassword] = useState(false);

  // Generate preview of the auth header
  const preview = useMemo(() => {
    if (auth.type === 'bearer' && auth.bearer?.token) {
      return `Authorization: Bearer ${auth.bearer.token}`;
    }
    if (auth.type === 'basic' && (auth.basic?.username || auth.basic?.password)) {
      const encoded = btoa(`${auth.basic?.username || ''}:${auth.basic?.password || ''}`);
      return `Authorization: Basic ${encoded}`;
    }
    if (auth.type === 'apikey' && auth.apiKey?.key) {
      const location = auth.apiKey.addTo === 'query' ? 'Query Param' : 'Header';
      return `${location}: ${auth.apiKey.key} = ${auth.apiKey.value || ''}`;
    }
    return null;
  }, [auth]);

  return (
    <div className={styles.authConfig}>
      {/* Type selector */}
      <div className={styles.typeSelector}>
        {AUTH_TYPES.map((type) => (
          <label
            key={type.value}
            className={`${styles.typeOption} ${auth.type === type.value ? styles.typeActive : ''}`}
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

      {/* None */}
      {auth.type === 'none' && (
        <div className={styles.noneMessage}>
          <Shield size={20} />
          <span>This request does not use any authorization</span>
        </div>
      )}

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Token</label>
            <VariableInput
              value={auth.bearer?.token || ''}
              onChange={(token) => onChange({ ...auth, bearer: { token } })}
              placeholder="Enter bearer token or {{variable}}"
            />
          </div>
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === 'basic' && (
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <VariableInput
              value={auth.basic?.username || ''}
              onChange={(username) =>
                onChange({
                  ...auth,
                  basic: { username, password: auth.basic?.password || '' },
                })
              }
              placeholder="Username"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.passwordWrapper}>
              <VariableInput
                value={auth.basic?.password || ''}
                onChange={(password) =>
                  onChange({
                    ...auth,
                    basic: { username: auth.basic?.username || '', password },
                  })
                }
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
              />
              <button
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                type="button"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'apikey' && (
        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label}>Key</label>
            <VariableInput
              value={auth.apiKey?.key || ''}
              onChange={(key) =>
                onChange({
                  ...auth,
                  apiKey: {
                    key,
                    value: auth.apiKey?.value || '',
                    addTo: auth.apiKey?.addTo || 'header',
                  },
                })
              }
              placeholder="e.g. X-API-Key"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Value</label>
            <VariableInput
              value={auth.apiKey?.value || ''}
              onChange={(value) =>
                onChange({
                  ...auth,
                  apiKey: {
                    key: auth.apiKey?.key || '',
                    value,
                    addTo: auth.apiKey?.addTo || 'header',
                  },
                })
              }
              placeholder="API key value or {{variable}}"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Add to</label>
            <select
              className={styles.select}
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
              <option value="query">Query Parameter</option>
            </select>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>Preview</span>
          <code className={styles.previewCode}>{preview}</code>
        </div>
      )}
    </div>
  );
};
