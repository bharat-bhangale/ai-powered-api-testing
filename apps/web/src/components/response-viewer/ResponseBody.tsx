import { useState, useCallback } from 'react';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';
import styles from './ResponseBody.module.css';

interface ResponseBodyProps {
  body: unknown;
}

/**
 * Pretty-printed JSON response body with collapsible tree and copy/raw toggle.
 */
export const ResponseBody = ({ body }: ResponseBodyProps) => {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const bodyString = typeof body === 'string' ? body : JSON.stringify(body, null, 2);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bodyString || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [bodyString]);

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={`${styles.toolbarBtn} ${!showRaw ? styles.toolbarBtnActive : ''}`}
          onClick={() => setShowRaw(false)}
          type="button"
        >
          Pretty
        </button>
        <button
          className={`${styles.toolbarBtn} ${showRaw ? styles.toolbarBtnActive : ''}`}
          onClick={() => setShowRaw(true)}
          type="button"
        >
          Raw
        </button>
        <div className={styles.toolbarSpacer} />
        <button
          className={styles.copyBtn}
          onClick={handleCopy}
          type="button"
          aria-label="Copy response body"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Body content */}
      <div className={styles.bodyContent}>
        {showRaw ? (
          <pre className={styles.rawBody}>{bodyString}</pre>
        ) : typeof body === 'object' && body !== null ? (
          <div className={styles.jsonTree}>
            <JsonNode value={body} depth={0} />
          </div>
        ) : (
          <pre className={styles.rawBody}>{bodyString}</pre>
        )}
      </div>
    </div>
  );
};

/* ===== Recursive JSON Tree Node ===== */

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
}

const JsonNode = ({ keyName, value, depth }: JsonNodeProps) => {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (value === null) {
    return (
      <div className={styles.jsonLine} style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && <span className={styles.jsonKey}>"{keyName}": </span>}
        <span className={styles.jsonNull}>null</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div className={styles.jsonLine} style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && <span className={styles.jsonKey}>"{keyName}": </span>}
        <span className={styles.jsonBool}>{value.toString()}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div className={styles.jsonLine} style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && <span className={styles.jsonKey}>"{keyName}": </span>}
        <span className={styles.jsonNumber}>{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div className={styles.jsonLine} style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && <span className={styles.jsonKey}>"{keyName}": </span>}
        <span className={styles.jsonString}>"{value}"</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div>
        <div
          className={styles.jsonCollapsible}
          style={{ paddingLeft: depth * 16 }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          {keyName !== undefined && <span className={styles.jsonKey}>"{keyName}": </span>}
          <span className={styles.jsonBracket}>[</span>
          {collapsed && (
            <span className={styles.jsonCollapsed}>{value.length} items</span>
          )}
          {collapsed && <span className={styles.jsonBracket}>]</span>}
        </div>
        {!collapsed && (
          <>
            {value.map((item, i) => (
              <JsonNode key={i} value={item} depth={depth + 1} />
            ))}
            <div className={styles.jsonLine} style={{ paddingLeft: depth * 16 }}>
              <span className={styles.jsonBracket}>]</span>
            </div>
          </>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div>
        <div
          className={styles.jsonCollapsible}
          style={{ paddingLeft: depth * 16 }}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          {keyName !== undefined && <span className={styles.jsonKey}>"{keyName}": </span>}
          <span className={styles.jsonBracket}>{'{'}</span>
          {collapsed && (
            <span className={styles.jsonCollapsed}>{entries.length} keys</span>
          )}
          {collapsed && <span className={styles.jsonBracket}>{'}'}</span>}
        </div>
        {!collapsed && (
          <>
            {entries.map(([k, v]) => (
              <JsonNode key={k} keyName={k} value={v} depth={depth + 1} />
            ))}
            <div className={styles.jsonLine} style={{ paddingLeft: depth * 16 }}>
              <span className={styles.jsonBracket}>{'}'}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};
