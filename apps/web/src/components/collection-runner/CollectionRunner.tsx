import { Play, Square, PlayCircle } from 'lucide-react';
import { useCollectionRunnerStore } from '@/stores/collectionRunnerStore';
import { useCollectionStore } from '@/stores/collectionStore';
import { RunResultRow } from './RunResultRow';
import styles from './CollectionRunner.module.css';

export const CollectionRunner = () => {
  const isRunning = useCollectionRunnerStore((s) => s.isRunning);
  const activeCollectionId = useCollectionRunnerStore((s) => s.activeCollectionId);
  const progress = useCollectionRunnerStore((s) => s.progress);
  const results = useCollectionRunnerStore((s) => s.results);
  const summary = useCollectionRunnerStore((s) => s.summary);
  const startRun = useCollectionRunnerStore((s) => s.startRun);
  const stopRun = useCollectionRunnerStore((s) => s.stopRun);

  // Get active collection from collectionStore
  const collection = useCollectionStore((s) => 
    s.collections.find((c) => c._id === activeCollectionId)
  );

  const handleStart = () => {
    if (!collection) return;
    startRun(collection._id);
  };

  const percentComplete = progress?.total
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // Render empty state if not running and no results
  if (!isRunning && results.length === 0 && !summary) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <PlayCircle size={48} opacity={0.2} />
          {collection ? (
            <>
              <h3>Run "{collection.name}"</h3>
              <p>Execute all requests sequentially and run their test scripts.</p>
              <button className={styles.runBtn} onClick={handleStart} type="button">
                <Play size={16} />
                Start Collection Run
              </button>
            </>
          ) : (
            <p>Select a collection to run</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <PlayCircle size={20} />
          {collection?.name || 'Collection Runner'}
        </div>
        <div className={styles.actions}>
          {isRunning ? (
            <button className={styles.stopBtn} onClick={stopRun} type="button">
              <Square size={16} />
              Stop Run
            </button>
          ) : (
            <button className={styles.runBtn} onClick={handleStart} type="button">
              <Play size={16} />
              Run Again
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (shows while running) */}
      {isRunning && progress && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span>Running requests...</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div 
              className={styles.progressBarFill} 
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={styles.content}>
        {/* Results List */}
        {results.length > 0 && (
          <div className={styles.resultsList}>
            {results.map((res, i) => (
              <RunResultRow key={`${res.requestIndex}-${i}`} result={res} />
            ))}
          </div>
        )}

        {/* Final Summary */}
        {summary && (
          <div className={styles.summaryCards}>
            <div className={styles.card}>
              <div className={`${styles.cardValue} ${summary.totalTestsFailed > 0 ? styles.valueError : styles.valueSuccess}`}>
                {summary.totalTestsPassed} / {summary.totalTestsPassed + summary.totalTestsFailed}
              </div>
              <div className={styles.cardLabel}>Tests Passed</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardValue}>
                {summary.completedRequests} / {summary.totalRequests}
              </div>
              <div className={styles.cardLabel}>Requests Executed</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardValue}>
                {summary.totalDuration}ms
              </div>
              <div className={styles.cardLabel}>Total Duration</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
