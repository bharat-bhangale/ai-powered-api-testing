import styles from './StatusBar.module.css';

/**
 * Bottom status bar — shows connection status and keyboard shortcut hints.
 */
export const StatusBar = () => {
  return (
    <footer className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.statusDot} />
        <span>Ready</span>
      </div>
      <div className={styles.right}>
        <span className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Send
        </span>
        <span className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>N</kbd> New Tab
        </span>
        <span className={styles.shortcut}>
          <kbd>Ctrl</kbd>+<kbd>L</kbd> Focus URL
        </span>
      </div>
    </footer>
  );
};
