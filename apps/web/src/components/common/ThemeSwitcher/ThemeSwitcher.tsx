import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import styles from './ThemeSwitcher.module.css';

const THEME_OPTIONS = [
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
] as const;

/**
 * ThemeSwitcher — pill-shaped 3-button toggle (Dark / Light / System).
 * Displays in the StatusBar. Active button gets primary-subtle background.
 */
export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.container} role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          className={`${styles.option} ${theme === value ? styles.active : ''}`}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          type="button"
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
};
