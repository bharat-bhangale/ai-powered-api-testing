import type { DiscoveredEndpoint } from '@/stores/discoveryStore';
import styles from './DiscoveryResultRow.module.css';

interface DiscoveryResultRowProps {
  endpoint: DiscoveredEndpoint;
}

const METHOD_CLASS: Record<string, string> = {
  GET: styles['GET'] as string,
  POST: styles['POST'] as string,
  PUT: styles['PUT'] as string,
  PATCH: styles['PATCH'] as string,
  DELETE: styles['DELETE'] as string,
};

function statusClass(status: number): string {
  if (status >= 500) return styles['status5xx'] as string;
  if (status >= 400) return styles['status4xx'] as string;
  if (status >= 300) return styles['status3xx'] as string;
  return styles['status2xx'] as string;
}

/**
 * DiscoveryResultRow — single endpoint row in the live discovery list.
 * Shows: method badge | path | HTTP status | body type | field count.
 */
export const DiscoveryResultRow = ({ endpoint }: DiscoveryResultRowProps) => {
  const methodCls = METHOD_CLASS[endpoint.method] ?? '';

  return (
    <div className={styles.row}>
      <span className={`${styles.method} ${methodCls}`}>{endpoint.method}</span>
      <span className={styles.path} title={endpoint.path}>{endpoint.path}</span>
      <span className={`${styles.status} ${statusClass(endpoint.status)}`}>{endpoint.status}</span>
      <span className={styles.typeBadge}>{endpoint.responseType}</span>
      {endpoint.fieldCount > 0 && (
        <span className={styles.fields}>{endpoint.fieldCount} fields</span>
      )}
    </div>
  );
};
