import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Settings, Globe } from 'lucide-react';
import { useEnvironmentStore } from '@/stores/environmentStore';
import styles from './EnvSelector.module.css';

interface EnvSelectorProps {
  onManage: () => void;
}

/**
 * Environment selector dropdown — sits in the status bar.
 * Shows active env name + colored dot. Opens dropdown with all envs.
 */
export const EnvSelector = ({ onManage }: EnvSelectorProps) => {
  const { environments, activeEnvironmentId, setActiveEnvironment } = useEnvironmentStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeEnv = environments.find((e) => e._id === activeEnvironmentId);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className={styles.selector} ref={dropdownRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <Globe size={12} />
        <span className={styles.envName}>{activeEnv?.name || 'No Environment'}</span>
        <ChevronDown size={12} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>Environments</div>

          {environments.length === 0 ? (
            <div className={styles.empty}>No environments yet</div>
          ) : (
            <div className={styles.envList}>
              {environments.map((env) => (
                <button
                  key={env._id}
                  className={`${styles.envItem} ${env._id === activeEnvironmentId ? styles.envActive : ''}`}
                  onClick={() => {
                    setActiveEnvironment(env._id);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span className={styles.envDot} />
                  <span>{env.name}</span>
                  {env.isDefault && <span className={styles.defaultBadge}>Default</span>}
                </button>
              ))}
            </div>
          )}

          <button
            className={styles.manageBtn}
            onClick={() => {
              setIsOpen(false);
              onManage();
            }}
            type="button"
          >
            <Settings size={12} />
            <span>Manage Environments</span>
          </button>
        </div>
      )}
    </div>
  );
};
