import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, Star } from 'lucide-react';
import { useEnvironmentStore, type EnvironmentVariable, type EnvironmentData } from '@/stores/environmentStore';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';
import styles from './EnvManagerModal.module.css';

interface EnvManagerModalProps {
  onClose: () => void;
}

/**
 * Environment Manager Modal — two-panel layout.
 * Left: environment list with add/delete. Right: variable editor with type toggle.
 */
export const EnvManagerModal = ({ onClose }: EnvManagerModalProps) => {
  const { environments, fetchEnvironments, createEnvironment, deleteEnvironment } = useEnvironmentStore();
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [editVars, setEditVars] = useState<EnvironmentVariable[]>([]);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<number>>(new Set());

  // Select the first env on load
  useEffect(() => {
    if (environments.length > 0 && !selectedEnvId) {
      setSelectedEnvId(environments[0]?._id ?? null);
    }
  }, [environments, selectedEnvId]);

  // When selected env changes, load its variables (fetch real values)
  useEffect(() => {
    if (!selectedEnvId) {
      setEditVars([]);
      setEditName('');
      return;
    }

    const loadEnv = async () => {
      try {
        const res = await apiClient.get(`/api/environments/${selectedEnvId}`);
        const env: EnvironmentData = res.data.data.environment;
        setEditName(env.name);
        setEditVars(env.variables.length > 0 ? env.variables : [{ key: '', value: '', type: 'text', description: '' }]);
        setRevealedSecrets(new Set());
      } catch {
        setEditVars([]);
        setEditName('');
      }
    };
    loadEnv();
  }, [selectedEnvId]);

  // Add variable row
  const addVariable = useCallback(() => {
    setEditVars((prev) => [...prev, { key: '', value: '', type: 'text', description: '' }]);
  }, []);

  // Remove variable row
  const removeVariable = useCallback((index: number) => {
    setEditVars((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update variable field
  const updateVariable = useCallback((index: number, field: keyof EnvironmentVariable, value: string) => {
    setEditVars((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }, []);

  // Toggle secret reveal
  const toggleReveal = useCallback((index: number) => {
    setRevealedSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Save current environment
  const handleSave = useCallback(async () => {
    if (!selectedEnvId || !editName.trim()) return;
    setIsSaving(true);
    try {
      const filteredVars = editVars.filter((v) => v.key.trim());
      await apiClient.patch(`/api/environments/${selectedEnvId}`, {
        name: editName.trim(),
        variables: filteredVars,
      });
      toast.success('Environment saved');
      await fetchEnvironments();
    } catch {
      toast.error('Failed to save environment');
    }
    setIsSaving(false);
  }, [selectedEnvId, editName, editVars, fetchEnvironments]);

  // Create new environment
  const handleCreate = useCallback(async () => {
    const name = prompt('Environment name:');
    if (!name?.trim()) return;
    await createEnvironment(name.trim());
    // Select the newly created one
    const envs = useEnvironmentStore.getState().environments;
    const newest = envs.find((e) => e.name === name.trim());
    if (newest) setSelectedEnvId(newest._id);
  }, [createEnvironment]);

  // Delete environment
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this environment?')) return;
    await deleteEnvironment(id);
    if (selectedEnvId === id) {
      const remaining = useEnvironmentStore.getState().environments;
      setSelectedEnvId(remaining[0]?._id || null);
    }
  }, [deleteEnvironment, selectedEnvId]);

  // Set as default
  const handleSetDefault = useCallback(async () => {
    if (!selectedEnvId) return;
    try {
      await apiClient.patch(`/api/environments/${selectedEnvId}/default`);
      toast.success('Default environment set');
      await fetchEnvironments();
    } catch {
      toast.error('Failed to set default');
    }
  }, [selectedEnvId, fetchEnvironments]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Manage Environments</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Left panel: env list */}
          <div className={styles.leftPanel}>
            <div className={styles.leftHeader}>
              <span className={styles.leftTitle}>Environments</span>
              <button className={styles.addEnvBtn} onClick={handleCreate} type="button" title="New Environment">
                <Plus size={14} />
              </button>
            </div>

            <div className={styles.envList}>
              {environments.map((env) => (
                <div
                  key={env._id}
                  className={`${styles.envRow} ${env._id === selectedEnvId ? styles.envRowActive : ''}`}
                  onClick={() => setSelectedEnvId(env._id)}
                >
                  <span className={styles.envRowName}>
                    {env.name}
                    {env.isDefault && <Star size={10} className={styles.defaultBadge} />}
                  </span>
                  <button
                    className={styles.envDeleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(env._id);
                    }}
                    type="button"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: variable editor */}
          <div className={styles.rightPanel}>
            {selectedEnvId ? (
              <>
                {/* Env name */}
                <div className={styles.nameField}>
                  <label className={styles.nameLabel}>Name</label>
                  <input
                    className={styles.nameInput}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Environment name"
                  />
                </div>

                {/* Variables table */}
                <div className={styles.varTable}>
                  <div className={styles.varHeader}>
                    <span className={styles.varCol}>Variable</span>
                    <span className={styles.varCol}>Value</span>
                    <span className={styles.varColSmall}>Type</span>
                    <span className={styles.varColAction} />
                  </div>

                  {editVars.map((v, i) => (
                    <div key={i} className={styles.varRow}>
                      <input
                        className={styles.varInput}
                        value={v.key}
                        onChange={(e) => updateVariable(i, 'key', e.target.value)}
                        placeholder="key"
                        spellCheck={false}
                      />
                      <div className={styles.valueCell}>
                        <input
                          className={styles.varInput}
                          type={v.type === 'secret' && !revealedSecrets.has(i) ? 'password' : 'text'}
                          value={v.value}
                          onChange={(e) => updateVariable(i, 'value', e.target.value)}
                          placeholder="value"
                          spellCheck={false}
                        />
                        {v.type === 'secret' && (
                          <button
                            className={styles.revealBtn}
                            onClick={() => toggleReveal(i)}
                            type="button"
                            title={revealedSecrets.has(i) ? 'Hide' : 'Reveal'}
                          >
                            {revealedSecrets.has(i) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        )}
                      </div>
                      <select
                        className={styles.typeSelect}
                        value={v.type}
                        onChange={(e) => updateVariable(i, 'type', e.target.value)}
                      >
                        <option value="text">Text</option>
                        <option value="secret">Secret</option>
                      </select>
                      <button
                        className={styles.removeVarBtn}
                        onClick={() => removeVariable(i)}
                        type="button"
                        title="Remove"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <button className={styles.addVarBtn} onClick={addVariable} type="button">
                  <Plus size={13} /> Add Variable
                </button>

                <div className={styles.saveRow}>
                  <button
                    className={styles.setDefaultBtn}
                    onClick={handleSetDefault}
                    type="button"
                    title="Set as default environment"
                  >
                    <Star size={13} />
                    Set as Default
                  </button>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={isSaving}
                    type="button"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.noSelection}>
                Select an environment or create a new one
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
