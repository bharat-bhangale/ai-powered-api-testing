import { Zap, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import styles from './TopBar.module.css';

/**
 * Application top bar — logo, app name, and theme toggle.
 */
export const TopBar = () => {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const themes: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex] ?? 'dark');
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
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
          className={styles.themeButton}
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
          type="button"
        >
          <ThemeIcon size={16} />
        </button>
      </div>
    </header>
  );
};
