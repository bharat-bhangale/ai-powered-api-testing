import { Copy, Play } from 'lucide-react';
import { toast } from 'sonner';
import { testMockEndpoint } from '@/services/mockServer.service';
import type { MockEndpointInfo } from '@/stores/mockServerStore';
import styles from './MockEndpointRow.module.css';

interface MockEndpointRowProps {
  endpoint: MockEndpointInfo;
}

const METHOD_CLASS: Record<string, string> = {
  GET: styles['GET'] as string,
  POST: styles['POST'] as string,
  PUT: styles['PUT'] as string,
  PATCH: styles['PATCH'] as string,
  DELETE: styles['DELETE'] as string,
};

export const MockEndpointRow = ({ endpoint }: MockEndpointRowProps) => {
  const methodCls = METHOD_CLASS[endpoint.method] ?? '';

  const handleCopy = () => {
    navigator.clipboard.writeText(endpoint.url);
    toast.success('URL copied!');
  };

  const handleTest = () => {
    testMockEndpoint(endpoint.method, endpoint.url);
  };

  return (
    <div className={styles.row}>
      <span className={`${styles.method} ${methodCls}`}>{endpoint.method}</span>
      <span className={styles.url} title={endpoint.url}>{endpoint.url}</span>

      <div className={styles.badges}>
        {endpoint.stateful && (
          <span className={`${styles.badge} ${styles.badgeStateful}`}>stateful</span>
        )}
        {endpoint.paginatable && (
          <span className={`${styles.badge} ${styles.badgePage}`}>paged</span>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.copyBtn} onClick={handleCopy} type="button" title="Copy URL">
          <Copy size={10} />
          Copy
        </button>
        <button className={styles.testBtn} onClick={handleTest} type="button" title="Load into ATX">
          <Play size={10} fill="currentColor" />
          Test
        </button>
      </div>
    </div>
  );
};
