import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import styles from './OfflineBanner.module.css';

/**
 * OfflineBanner — shows a persistent warning banner when the browser
 * goes offline. Auto-dismisses when back online.
 */
export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className={styles.banner} role="alert">
      <WifiOff size={14} />
      <span>You're offline — requests will fail until you reconnect</span>
      <button
        className={styles.retryBtn}
        onClick={() => window.location.reload()}
        type="button"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  );
};
