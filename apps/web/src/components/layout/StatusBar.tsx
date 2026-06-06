import { useState, useEffect } from 'react';
import { EnvSelector } from '@/components/environment/EnvSelector';
import { EnvManagerModal } from '@/components/environment/EnvManagerModal';
import { AIUsageIndicator } from '@/components/ai/AIUsageIndicator';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher/ThemeSwitcher';
import { isDesktopRuntime } from '@/services/desktop.service';
import { DownloadCloud } from 'lucide-react';
import styles from './StatusBar.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Bottom status bar — shows connection status, environment selector,
 * AI usage indicator, keyboard shortcut hints, and theme switcher.
 */
export const StatusBar = () => {
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { method: 'GET' });
        setIsConnected(res.ok);
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 60_000); // Re-check every 60s

    if (isDesktopRuntime() && window.atxDesktop) {
      const unsubscribe = window.atxDesktop.onUpdateAvailable((version) => {
        setUpdateVersion(version);
      });
      return () => {
        clearInterval(interval);
        unsubscribe();
      };
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <footer className={styles.statusBar}>
        <div className={styles.left}>
          <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <span className={styles.divider} />
          <EnvSelector onManage={() => setShowEnvManager(true)} />
          <span className={styles.divider} />
          <AIUsageIndicator />
        </div>
        <div className={styles.right}>
          {updateVersion && (
            <span className={styles.updateBadge} title={`Update ${updateVersion} available. Restart ATX to install.`}>
              <DownloadCloud size={14} /> Update Ready
            </span>
          )}
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Send
          </span>
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd>+<kbd>S</kbd> Save
          </span>
          <span className={styles.shortcut}>
            <kbd>Ctrl</kbd>+<kbd>L</kbd> URL
          </span>
          <span className={styles.divider} />
          <ThemeSwitcher />
        </div>
      </footer>

      {showEnvManager && (
        <EnvManagerModal onClose={() => setShowEnvManager(false)} />
      )}
    </>
  );
};
