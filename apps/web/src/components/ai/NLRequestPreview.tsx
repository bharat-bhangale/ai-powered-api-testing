import { useEffect, useRef } from 'react';
import { Sparkles, Check, Trash2, X, Info } from 'lucide-react';
import type { GeneratedRequest } from '@/hooks/useNLRequest';
import styles from './NLRequestPreview.module.css';

interface NLRequestPreviewProps {
  request: GeneratedRequest;
  onAccept: () => void;
  onDiscard: () => void;
}

export const NLRequestPreview = ({ request, onAccept, onDiscard }: NLRequestPreviewProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDiscard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDiscard]);

  // Click outside to discard (optional, but good UX)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onDiscard();
    }
  };

  const hasHeaders = request.headers && request.headers.length > 0;
  const hasParams = request.queryParams && request.queryParams.length > 0;
  const hasBody = request.body && request.bodyType !== 'none';

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.panel} ref={panelRef}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Sparkles size={16} className={styles.sparkle} />
            <span className={styles.headerTitle}>AI Generated Request</span>
            <span className={styles.badge}>Ready</span>
          </div>
          <button className={styles.closeBtn} onClick={onDiscard} type="button" title="Discard (Esc)">
            <X size={16} />
          </button>
        </div>

        {/* Body content */}
        <div className={styles.body}>
          {/* AI Explanation */}
          {request.explanation && (
            <div className={styles.explanation}>
              <Info size={14} className={styles.explanationIcon} />
              <span>{request.explanation}</span>
            </div>
          )}

          {/* Request Config Grid */}
          <div className={styles.grid}>
            
            {/* URL & Method */}
            <div className={styles.row}>
              <div className={styles.rowLabel}>Endpoint</div>
              <div className={styles.rowValue}>
                <span className={`${styles.methodBadge} ${styles[`method-${request.method}`]}`}>
                  {request.method}
                </span>
                <span style={{ marginLeft: 8 }}>{request.url || 'URL could not be determined'}</span>
              </div>
            </div>

            {/* Auth Suggestion */}
            {request.authSuggestion && request.authSuggestion !== 'none' && (
              <div className={styles.row}>
                <div className={styles.rowLabel}>Auth</div>
                <div className={styles.rowValue}>
                  <span className={styles.authSuggestion}>
                    Use {request.authSuggestion} authentication
                  </span>
                </div>
              </div>
            )}

            {/* Query Params */}
            {hasParams && (
              <div className={styles.row}>
                <div className={styles.rowLabel}>Params</div>
                <div className={styles.rowValue}>
                  <div className={styles.kvList}>
                    {request.queryParams.map((p, i) => (
                      <div key={i} className={styles.kvItem}>
                        <span className={styles.kvKey}>{p.key}</span>
                        <span className={styles.kvSep}>=</span>
                        <span className={styles.kvVal}>{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Headers */}
            {hasHeaders && (
              <div className={styles.row}>
                <div className={styles.rowLabel}>Headers</div>
                <div className={styles.rowValue}>
                  <div className={styles.kvList}>
                    {request.headers.map((h, i) => (
                      <div key={i} className={styles.kvItem}>
                        <span className={styles.kvKey}>{h.key}</span>
                        <span className={styles.kvSep}>:</span>
                        <span className={styles.kvVal}>{h.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            {hasBody && (
              <div className={styles.row}>
                <div className={styles.rowLabel}>Body</div>
                <div className={styles.rowValue}>
                  <div className={styles.codeBlock}>
                    {request.body}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Action Bar */}
        <div className={styles.actions}>
          <button className={styles.discardBtn} onClick={onDiscard} type="button">
            <Trash2 size={14} />
            Discard
          </button>
          <button 
            className={styles.acceptBtn} 
            onClick={onAccept} 
            type="button" 
            autoFocus
            disabled={!request.url}
          >
            <Check size={14} />
            Use This Request
          </button>
        </div>

      </div>
    </div>
  );
};
