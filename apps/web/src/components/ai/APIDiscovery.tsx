import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Radar, Square, Save, AlertTriangle, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useDiscoveryStore } from '@/stores/discoveryStore';
import { startDiscovery, stopDiscovery, saveDiscoveredCollection } from '@/services/discovery.service';
import { DiscoveryResultRow } from './DiscoveryResultRow';
import styles from './APIDiscovery.module.css';

interface APIDiscoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

const PHASE_PROGRESS: Record<number, number> = { 1: 15, 2: 50, 3: 80, 4: 95 };

/**
 * APIDiscovery — slide-in panel for AI-powered API reverse engineering.
 * User enters a base URL, clicks Start, and watches endpoints appear live.
 * On completion, can save the full collection to their ATX account.
 */
export const APIDiscovery = ({ isOpen, onClose }: APIDiscoveryProps) => {
  const {
    status,
    currentPhase,
    currentProbe,
    endpoints,
    collection,
    authRequired,
    reset,
  } = useDiscoveryStore();

  const [baseUrl, setBaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll endpoint list to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [endpoints.length]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Close on Escape (unless discovering)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'discovering') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, status, onClose]);

  const handleStart = useCallback(async () => {
    const trimmed = baseUrl.trim();
    if (!trimmed) {
      toast.error('Please enter a base URL');
      return;
    }

    try {
      await startDiscovery(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Discovery failed';
      toast.error(msg);
    }
  }, [baseUrl]);

  const handleStop = useCallback(async () => {
    await stopDiscovery();
    toast.info('Discovery stopped');
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveDiscoveredCollection();
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setBaseUrl('');
  }, [reset]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && status !== 'discovering') onClose();
  };

  const progressPct =
    status === 'complete'
      ? 100
      : status === 'stopped'
      ? 60
      : currentPhase
      ? PHASE_PROGRESS[currentPhase.phase] ?? 10
      : status === 'discovering'
      ? 5
      : 0;

  const isDiscovering = status === 'discovering';
  const isDone = status === 'complete' || status === 'stopped';

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Radar size={20} className={styles.radarIcon} />
            <div>
              <h3 className={styles.headerTitle}>AI API Reverse Engineer</h3>
              <div className={styles.headerSubtitle}>Discover all endpoints from a base URL</div>
            </div>
          </div>
          <div className={styles.headerActions}>
            {isDone && (
              <button className={styles.iconBtn} onClick={handleReset} title="Start new discovery" type="button">
                <Radar size={15} />
              </button>
            )}
            <button
              className={styles.iconBtn}
              onClick={onClose}
              title={isDiscovering ? 'Discovery in progress' : 'Close (Esc)'}
              type="button"
              disabled={isDiscovering}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Auth Warning */}
        {authRequired && (
          <div className={styles.authWarning}>
            <AlertTriangle size={14} />
            API requires authentication — some endpoints may need credentials to access
          </div>
        )}

        {/* URL Input */}
        <div className={styles.urlSection}>
          <label className={styles.urlLabel} htmlFor="discovery-url">
            Target Base URL
          </label>
          <div className={styles.urlRow}>
            <input
              id="discovery-url"
              ref={inputRef}
              className={styles.urlInput}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isDiscovering && handleStart()}
              placeholder="https://api.example.com"
              disabled={isDiscovering}
              spellCheck={false}
            />
            {isDiscovering ? (
              <button className={styles.stopBtn} onClick={handleStop} type="button">
                <Square size={14} fill="currentColor" />
                Stop
              </button>
            ) : (
              <button
                className={styles.startBtn}
                onClick={handleStart}
                type="button"
                disabled={!baseUrl.trim() || isDone}
              >
                <Globe size={14} />
                {status === 'idle' ? 'Start Discovery' : 'Discover'}
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        {(isDiscovering || isDone) && (
          <div className={styles.progressSection}>
            <div className={styles.phaseRow}>
              <span className={styles.phaseLabel}>
                {status === 'complete'
                  ? '✓ Discovery complete'
                  : status === 'stopped'
                  ? '⏹ Stopped'
                  : currentPhase?.description ?? 'Initializing...'}
              </span>
              <span className={styles.endpointCount}>
                {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            {currentProbe && isDiscovering && (
              <div className={styles.probingRow}>
                ▸ {currentProbe.method} {currentProbe.url}
              </div>
            )}
          </div>
        )}

        {/* Endpoint list */}
        {endpoints.length > 0 ? (
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <span className={styles.resultsTitle}>Discovered Endpoints</span>
            </div>
            <div className={styles.resultsList} ref={listRef}>
              {endpoints.map((ep) => (
                <DiscoveryResultRow key={ep.id} endpoint={ep} />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Radar size={48} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>
              {isDiscovering ? 'Scanning API surface...' : 'Enter a URL to start'}
            </p>
            <p className={styles.emptyHint}>
              {isDiscovering
                ? 'AI is intelligently probing common REST patterns and analyzing responses to discover all endpoints.'
                : 'ATX will probe common REST endpoint patterns, analyze responses, discover resources, and build a complete collection automatically.'}
            </p>
          </div>
        )}

        {/* Save Collection button — shown on completion */}
        {status === 'complete' && collection && (
          <div className={styles.actionsBar}>
            <span className={styles.actionsLeft}>
              <strong>✓ {endpoints.length} endpoints</strong> discovered across{' '}
              {collection.folders.length} resource group{collection.folders.length !== 1 ? 's' : ''}
            </span>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save as Collection'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
