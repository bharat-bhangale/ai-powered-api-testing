import { Zap, Moon, Sun, Monitor, Sparkles, Settings, Radar } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAIStore } from '@/stores/aiStore';
import { APIDiscovery } from '@/components/ai/APIDiscovery';
import styles from './TopBar.module.css';

/**
 * Application top bar — logo, app name, AI toggle, and theme toggle.
 */
export const TopBar = () => {
  const { theme, setTheme } = useTheme();
  const togglePanel = useAIStore((s) => s.togglePanel);
  const isPanelOpen = useAIStore((s) => s.isPanelOpen);
  const navigate = useNavigate();
  const location = useLocation();
  const [showDiscovery, setShowDiscovery] = useState(false);

  const cycleTheme = () => {
    const themes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex] ?? 'dark');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <>
    <header className={styles.topBar}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <Zap size={18} />
        </div>
        <span className={styles.appName}>ATX</span>
        <span className={styles.appSub}>API Testing</span>
      </div>

      <div className={styles.right}>
        <button
          id="ai-toggle-button"
          className={`${styles.aiButton} ${isPanelOpen ? styles.aiButtonActive : ''}`}
          onClick={togglePanel}
          title="AI Assistant (Ctrl+Shift+I)"
          type="button"
        >
          <Sparkles size={15} />
        </button>
        <button
          id="api-discovery-button"
          className={styles.aiButton}
          onClick={() => setShowDiscovery(true)}
          title="AI API Reverse Engineer"
          type="button"
        >
          <Radar size={15} />
        </button>
        <button
          className={`${styles.themeButton} ${location.pathname === '/settings' ? styles.active : ''}`}
          onClick={() => navigate('/settings')}
          title="Settings"
          type="button"
        >
          <Settings size={16} />
        </button>
        <button
          className={styles.themeButton}
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          type="button"
        >
          <ThemeIcon size={16} />
        </button>
      </div>
    </header>

    {/* API Discovery Panel */}
    <APIDiscovery isOpen={showDiscovery} onClose={() => setShowDiscovery(false)} />
    </>
  );
};
