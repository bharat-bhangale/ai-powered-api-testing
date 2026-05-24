import { useState } from 'react';
import { EnvSelector } from '@/components/environment/EnvSelector';
import { EnvManagerModal } from '@/components/environment/EnvManagerModal';
import styles from './StatusBar.module.css';

/**
 * Bottom status bar — shows connection status, environment selector, and keyboard shortcut hints.
 */
export const StatusBar = () => {
  const [showEnvManager, setShowEnvManager] = useState(false);

  return (
    <>
      <footer className={styles.statusBar}>
        <div className={styles.left}>
          <span className={styles.statusDot} />
          <span>Ready</span>
          <span className={styles.divider} />
          <EnvSelector onManage={() => setShowEnvManager(true)} />
        </div>
        <div className={styles.right}>
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Send
          </span>
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd>+<kbd>S</kbd> Save
          </span>
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd>+<kbd>N</kbd> New Tab
          </span>
        </div>
      </footer>

      {showEnvManager && (
        <EnvManagerModal onClose={() => setShowEnvManager(false)} />
      )}
    </>
  );
};
