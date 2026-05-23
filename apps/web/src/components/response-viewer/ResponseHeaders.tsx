import styles from './ResponseHeaders.module.css';

interface ResponseHeadersProps {
  headers: Record<string, string>;
}

/**
 * Simple table displaying response headers.
 */
export const ResponseHeaders = ({ headers }: ResponseHeadersProps) => {
  const entries = Object.entries(headers || {});

  if (entries.length === 0) {
    return (
      <div className={styles.empty}>No response headers</div>
    );
  }

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Header</th>
            <th className={styles.th}>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className={styles.row}>
              <td className={styles.headerName}>{key}</td>
              <td className={styles.headerValue}>{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
