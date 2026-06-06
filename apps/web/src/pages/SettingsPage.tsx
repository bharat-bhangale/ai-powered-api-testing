import React, { useEffect, useState, useRef } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { isDesktopRuntime, showDesktopSaveDialog, showDesktopOpenDialog } from '../services/desktop.service';
import { apiClient } from '../services/api';
import { toast } from 'sonner';
import styles from './SettingsPage.module.css';

export const SettingsPage: React.FC = () => {
  const { settings, secrets, isLoading, error, fetchSettings, fetchSecrets, setSetting, addSecret, deleteSecret } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'secrets' | 'proxy' | 'certs'>('general');

  // Local state for adding secret
  const [newSecretScope, setNewSecretScope] = useState('');
  const [newSecretLabel, setNewSecretLabel] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  
  // Local state for settings
  const [aiApiKey, setAiApiKey] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for proxy
  const [proxyMode, setProxyMode] = useState<'none' | 'system' | 'manual'>('none');
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState(8080);
  
  // Local state for certificates
  const [certs, setCerts] = useState<any[]>([]);
  const [certLabel, setCertLabel] = useState('');
  const [certPassphrase, setCertPassphrase] = useState('');
  
  useEffect(() => {
    fetchSettings();
    if (isDesktopRuntime()) {
      fetchSecrets();
    }
  }, [fetchSettings, fetchSecrets]);

  useEffect(() => {
    if (settings['ai.apiKey']) setAiApiKey(settings['ai.apiKey']);
    if (settings.proxy) {
      const p = settings.proxy as any;
      setProxyMode(p.mode || 'none');
      setProxyHost(p.host || '');
      setProxyPort(p.port || 8080);
    }
  }, [settings]);

  const loadCerts = async () => {
    try {
      const res = await apiClient.get('/api/certificates');
      setCerts(res.data);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (activeTab === 'certs') {
      loadCerts();
    }
  }, [activeTab]);

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

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      if (isDesktopRuntime()) {
        const result = await showDesktopSaveDialog({
          title: 'Export ATX Backup',
          defaultPath: `ATX_Backup_${new Date().toISOString().split('T')[0]}.json`,
          filters: [{ name: 'JSON Backup', extensions: ['json'] }]
        });

        if (result) {
          await apiClient.post('/api/backups/export', { targetPath: result });
          toast.success('Backup exported successfully');
        }
      } else {
        const res = await apiClient.post('/api/backups/export', {});
        const content = JSON.stringify(res.data.data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATX_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Backup downloaded successfully');
      }
    } catch (err) {
      toast.error('Backup failed');
      console.error(err);
    }
    setIsBackingUp(false);
  };

  const handleRestoreFile = async (fileOrContent: string | File) => {
    setIsRestoring(true);
    try {
      let content = '';
      if (typeof fileOrContent === 'string') {
        content = fileOrContent;
      } else {
        content = await fileOrContent.text();
      }

      const manifest = JSON.parse(content);
      await apiClient.post('/api/backups/import', { manifest });
      toast.success('Restore completed successfully. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error('Restore failed');
      console.error(err);
    }
    setIsRestoring(false);
  };

  const handleRestoreClick = async () => {
    if (isDesktopRuntime()) {
      const result = await showDesktopOpenDialog({
        title: 'Select ATX Backup File',
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      });
      if (result) {
        await handleRestoreFile(result.content);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSaveProxy = () => {
    setSetting('proxy', { mode: proxyMode, host: proxyHost, port: proxyPort });
    toast.success('Proxy settings saved');
  };

  const handleAddCert = async () => {
    if (isDesktopRuntime()) {
      const result = await showDesktopOpenDialog({
        title: 'Select PFX/P12 Certificate',
        filters: [{ name: 'Certificates', extensions: ['pfx', 'p12'] }]
      });
      if (result) {
        try {
          await apiClient.post('/api/certificates', {
            label: certLabel || 'My Certificate',
            certificateType: 'pfx',
            filePath: result.content, // Using absolute path directly
            passphrase: certPassphrase || undefined
          });
          toast.success('Certificate added');
          setCertLabel('');
          setCertPassphrase('');
          loadCerts();
        } catch {
          toast.error('Failed to add certificate');
        }
      }
    } else {
      toast.error('Certificate upload requires Desktop runtime');
    }
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
          <button 
            className={`${styles.tabBtn} ${activeTab === 'proxy' ? styles.active : ''}`}
            onClick={() => setActiveTab('proxy')}
          >
            Proxy Settings
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'certs' ? styles.active : ''}`}
            onClick={() => setActiveTab('certs')}
          >
            Client Certificates
          </button>
        </div>

        <div className={styles.tabContent}>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <>
              {activeTab === 'general' && (
                <div className={styles.section}>
                  <h2>General Settings</h2>
                  <p>Configure general application behavior and manage your data.</p>
                  
                  <div className={styles.dataSection}>
                    <h3>Backup & Restore</h3>
                    <p className={styles.helpText}>
                      Create a full backup of all your collections, environments, requests, and settings. 
                      Secrets are securely redacted from backups.
                    </p>
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.primaryBtn} 
                        onClick={handleBackup}
                        disabled={isBackingUp}
                      >
                        {isBackingUp ? 'Exporting...' : 'Export Backup'}
                      </button>
                      <button 
                        className={styles.secondaryBtn} 
                        onClick={handleRestoreClick}
                        disabled={isRestoring}
                      >
                        {isRestoring ? 'Restoring...' : 'Restore from Backup'}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".json"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleRestoreFile(f);
                        }}
                      />
                    </div>
                  </div>
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

              {activeTab === 'proxy' && (
                <div className={styles.section}>
                  <h2>Proxy Settings</h2>
                  <p>Configure HTTP proxy for the test executor.</p>
                  
                  <div className={styles.formGroup}>
                    <label>Proxy Mode</label>
                    <select value={proxyMode} onChange={e => setProxyMode(e.target.value as any)}>
                      <option value="none">None</option>
                      <option value="system">System Proxy</option>
                      <option value="manual">Manual Proxy</option>
                    </select>
                  </div>

                  {proxyMode === 'manual' && (
                    <>
                      <div className={styles.formGroup}>
                        <label>Proxy Host</label>
                        <input type="text" value={proxyHost} onChange={e => setProxyHost(e.target.value)} placeholder="e.g. 127.0.0.1" />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Proxy Port</label>
                        <input type="number" value={proxyPort} onChange={e => setProxyPort(parseInt(e.target.value, 10))} />
                      </div>
                    </>
                  )}

                  <button className={styles.primaryBtn} onClick={handleSaveProxy}>Save Proxy Settings</button>
                </div>
              )}

              {activeTab === 'certs' && (
                <div className={styles.section}>
                  <h2>Client Certificates</h2>
                  <p>Manage mTLS client certificates (PFX/P12 format).</p>
                  
                  <div className={styles.secretsList}>
                    {certs.length === 0 ? (
                      <p className={styles.emptyState}>No certificates found.</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Label</th>
                            <th>File Path</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {certs.map(c => (
                            <tr key={c.id}>
                              <td>{c.label}</td>
                              <td>{c.filePath}</td>
                              <td>
                                <button className={styles.dangerBtn} onClick={async () => {
                                  await apiClient.delete(`/api/certificates/${c.id}`);
                                  loadCerts();
                                }}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <h3>Add Certificate</h3>
                  <div className={styles.addSecretForm}>
                    <input type="text" placeholder="Certificate Label" value={certLabel} onChange={e => setCertLabel(e.target.value)} />
                    <input type="password" placeholder="Passphrase (Optional)" value={certPassphrase} onChange={e => setCertPassphrase(e.target.value)} />
                    <button className={styles.primaryBtn} onClick={handleAddCert}>Select File & Add</button>
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
