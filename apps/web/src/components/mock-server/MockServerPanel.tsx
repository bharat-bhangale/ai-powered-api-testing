import { useEffect, useCallback } from 'react';
import { X, Server, Play, Square, Sparkles, AlertTriangle } from 'lucide-react';
import { useMockServerStore } from '@/stores/mockServerStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { generateMockServer, startMockServer, stopMockServer, fetchMockStatus } from '@/services/mockServer.service';
import { MockEndpointRow } from './MockEndpointRow';
import { MockServerSettings } from './MockServerSettings';
import styles from './MockServerPanel.module.css';

interface MockServerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MockServerPanel — slide-in drawer for the AI Smart Mock Server.
 *
 * Flow:
 *   1. User selects a collection + clicks "Generate Mock"
 *   2. AI builds stateful route config
 *   3. User reviews generated endpoints + adjusts settings (port, delay)
 *   4. Click "Start Mock Server" — Express server boots on selected port
 *   5. Live endpoint list with copy/test buttons
 */
export const MockServerPanel = ({ isOpen, onClose }: MockServerPanelProps) => {
  const {
    state,
    status,
    endpoints,
    errorMessage,
    selectedCollectionId,
    port,
    setSelectedCollectionId,
  } = useMockServerStore();

  const collections = useCollectionStore((s) => s.collections);

  const isRunning = state === 'running';
  const isBusy = ['generating', 'starting', 'stopping'].includes(state);

  // Load collections on open, and sync status
  useEffect(() => {
    if (!isOpen) return;
    if (collections.length === 0) useCollectionStore.getState().fetchCollections();
    fetchMockStatus();
  }, [isOpen, collections.length]);

  // Close on Escape (if not busy)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isBusy, onClose]);

  const handleGenerate = useCallback(async () => {
    if (!selectedCollectionId) return;
    await generateMockServer(selectedCollectionId, port);
  }, [selectedCollectionId, port]);

  const handleStart = useCallback(async () => {
    await startMockServer(port);
  }, [port]);

  const handleStop = useCallback(async () => {
    await stopMockServer();
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isBusy) onClose();
  };

  // Derive status dot class
  let dotClass = styles.statusStopped;
  if (isRunning) dotClass = styles.statusRunning;
  else if (isBusy) dotClass = styles.statusLoading;

  // Derive status text
  const statusText = {
    idle: 'Not running',
    generating: 'Generating mock config with AI…',
    ready: 'Config ready — click Start to run',
    starting: 'Starting mock server…',
    running: `Running on http://localhost:${status.port}`,
    stopping: 'Stopping…',
    error: 'Error',
  }[state];

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Server size={20} className={styles.serverGradient} />
            <div>
              <h3 className={styles.headerTitle}>AI Smart Mock Server</h3>
              <div className={styles.headerSubtitle}>Generate stateful mocks from any collection</div>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconBtn} onClick={onClose} disabled={isBusy} type="button" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={13} />
            {errorMessage}
          </div>
        )}

        {/* Status Bar */}
        <div className={styles.statusBar}>
          <div className={`${styles.statusDot} ${dotClass}`} />
          <div>
            <div className={styles.statusText}>{status.title || statusText}</div>
            {isRunning && (
              <div className={styles.statusMeta}>
                {status.endpointCount} endpoints · started {new Date(status.startedAt!).toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className={styles.statusActions}>
            {isRunning ? (
              <button className={styles.stopBtn} onClick={handleStop} disabled={isBusy} type="button">
                <Square size={13} fill="currentColor" />
                Stop
              </button>
            ) : (
              <button
                className={styles.startBtn}
                onClick={handleStart}
                disabled={isBusy || state === 'idle'}
                type="button"
              >
                {isBusy && state === 'starting' ? (
                  <div className={styles.spinner} />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}
                {state === 'starting' ? 'Starting…' : 'Start Server'}
              </button>
            )}
          </div>
        </div>

        {/* Generate Section */}
        {!isRunning && (
          <div className={styles.generateSection}>
            <span className={styles.sectionLabel}>Generate from Collection</span>
            <div className={styles.generateRow}>
              <select
                className={styles.collectionSelect}
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                disabled={isBusy}
              >
                <option value="">— Select a collection —</option>
                {collections.map((c) => (
                  <option key={c._id as string} value={c._id as string}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className={styles.generateBtn}
                onClick={handleGenerate}
                disabled={!selectedCollectionId || isBusy}
                type="button"
              >
                {state === 'generating' ? (
                  <><div className={styles.spinner} /> Generating…</>
                ) : (
                  <><Sparkles size={13} /> Generate Mock</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <MockServerSettings disabled={isRunning || isBusy} />

        {/* Endpoint List */}
        {endpoints.length > 0 ? (
          <div className={styles.endpointSection}>
            <div className={styles.endpointHeader}>
              <span className={styles.endpointTitle}>{endpoints.length} Mock Endpoints</span>
            </div>
            <div className={styles.endpointList}>
              {endpoints.map((ep, i) => (
                <MockEndpointRow key={`${ep.method}-${ep.path}-${i}`} endpoint={ep} />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Server size={48} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>
              {state === 'generating' ? 'AI is analyzing your collection…' : 'No mock endpoints yet'}
            </p>
            <p className={styles.emptyHint}>
              {state === 'generating'
                ? 'Generating realistic seed data, CRUD routes, and state management for your API.'
                : 'Select a collection and click "Generate Mock" to create a fully stateful mock server with realistic data.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
