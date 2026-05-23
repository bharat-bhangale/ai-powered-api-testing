import styles from './ResponseMeta.module.css';

interface ResponseMetaProps {
  status: number;
  statusText: string;
  time: number;
  size: number;
}

/**
 * Displays status badge, response time, and payload size.
 */
export const ResponseMeta = ({ status, statusText, time, size }: ResponseMetaProps) => {
  const getStatusColor = () => {
    if (status >= 200 && status < 300) return 'var(--color-status-2xx)';
    if (status >= 300 && status < 400) return 'var(--color-status-3xx)';
    if (status >= 400 && status < 500) return 'var(--color-status-4xx)';
    if (status >= 500) return 'var(--color-status-5xx)';
    return 'var(--color-text-tertiary)';
  };

  const getTimeColor = () => {
    if (time < 200) return 'var(--color-success)';
    if (time < 1000) return 'var(--color-warning)';
    return 'var(--color-error)';
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const base = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(base));
    const index = Math.min(i, units.length - 1);
    const val = bytes / Math.pow(base, index);
    return `${val.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  return (
    <div className={styles.meta}>
      {/* Status badge */}
      <span
        className={styles.statusBadge}
        style={{ color: getStatusColor(), borderColor: getStatusColor() }}
      >
        {status} {statusText}
      </span>

      {/* Response time */}
      <span className={styles.metric} style={{ color: getTimeColor() }}>
        {time}ms
      </span>

      {/* Payload size */}
      <span className={styles.metric}>
        {formatSize(size)}
      </span>
    </div>
  );
};
