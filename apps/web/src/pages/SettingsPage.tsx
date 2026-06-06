import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { isDesktopRuntime } from '../services/desktop.service';
import styles from './SettingsPage.module.css';

export const SettingsPage: React.FC = () => {
  const { settings, secrets, isLoading, error, fetchSettings, fetchSecrets, setSetting, addSecret, deleteSecret } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'secrets'>('general');

  // Local state for adding secret
  const [newSecretScope, setNewSecretScope] = useState('');
  const [newSecretLabel, setNewSecretLabel] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  
  // Local state for settings
  const [aiApiKey, setAiApiKey] = useState('');
  
  useEffect(() => {
    fetchSettings();
    if (isDesktopRuntime()) {
      fetchSecrets();
    }
  }, [fetchSettings, fetchSecrets]);

  useEffect(() => {
    if (settings['ai.apiKey']) setAiApiKey(settings['ai.apiKey']);
  }, [settings]);

  const handleSaveAiSettings = () => {
    setSetting('ai.apiKey', aiApiKey);
  };

  const handleAddSecret = async () => {
    if (!newSecretScope || !newSecretLabel || !newSecretValue) return;
    await addSecret(newSecretScope, newSecretLabel, newSecretValue);
    setNewSecretScope('');
    setNewSecretLabel('');
    setNewSecretValue('');
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.header}>
        <h1>Settings</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'ai' ? styles.active : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Assistant
          </button>
          {isDesktopRuntime() && (
            <button 
              className={`${styles.tabBtn} ${activeTab === 'secrets' ? styles.active : ''}`}
              onClick={() => setActiveTab('secrets')}
            >
              Keychain Secrets
            </button>
          )}
        </div>

        <div className={styles.tabContent}>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className={styles.section}>
                  <h2>General Settings</h2>
                  <p>Configure general application behavior.</p>
                  {/* General settings can go here */}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className={styles.section}>
                  <h2>AI Assistant Configuration</h2>
                  <p>Configure the AI model and API keys used for request generation and testing.</p>
                  
                  <div className={styles.formGroup}>
                    <label>Gemini API Key</label>
                    <input 
                      type="password" 
                      value={aiApiKey} 
                      onChange={(e) => setAiApiKey(e.target.value)} 
                      placeholder="AIzaSy..." 
                    />
                    <small>Stored securely in your local database settings.</small>
                  </div>
                  <button className={styles.primaryBtn} onClick={handleSaveAiSettings}>Save AI Settings</button>
                </div>
              )}

              {activeTab === 'secrets' && isDesktopRuntime() && (
                <div className={styles.section}>
                  <h2>Native Keychain Secrets</h2>
                  <p>Store sensitive environment variables securely using the OS native keychain.</p>
                  
                  <div className={styles.secretsList}>
                    {secrets.length === 0 ? (
                      <p className={styles.emptyState}>No secrets saved.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Scope</th>
                            <th>Label</th>
                            <th>Value</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {secrets.map(s => (
                            <tr key={s.id}>
                              <td>{s.scope}</td>
                              <td>{s.label}</td>
                              <td>{s.redactedPreview}</td>
                              <td>
                                <button className={styles.dangerBtn} onClick={() => deleteSecret(s.id)}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <h3>Add New Secret</h3>
                  <div className={styles.addSecretForm}>
                    <input 
                      type="text" 
                      placeholder="Scope (e.g., Environment Name)" 
                      value={newSecretScope} 
                      onChange={e => setNewSecretScope(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      placeholder="Label (e.g., AWS_KEY)" 
                      value={newSecretLabel} 
                      onChange={e => setNewSecretLabel(e.target.value)} 
                    />
                    <input 
                      type="password" 
                      placeholder="Value" 
                      value={newSecretValue} 
                      onChange={e => setNewSecretValue(e.target.value)} 
                    />
                    <button className={styles.primaryBtn} onClick={handleAddSecret}>Add Securely</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
