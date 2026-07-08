import { useCallback } from 'react';
import { Copy, Save, ClipboardCheck, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { useTestBuilderStore, type GeneratedConvTest } from '@/stores/testBuilderStore';
import { useRequestStore } from '@/stores/requestStore';
import { useTestRunnerStore } from '@/stores/testRunnerStore';
import styles from './TestBuilderPreview.module.css';

const CATEGORY_LABELS: Record<string, string> = {
  status: 'Status',
  body_structure: 'Body',
  data_validation: 'Data',
  performance: 'Perf',
  edge_case: 'Edge',
  auth: 'Auth',
  security: 'Security',
};

interface TestBuilderPreviewProps {
  tabId: string;
  isComplete: boolean;
}

/**
 * TestBuilderPreview — right-hand pane of the Test Builder Chat.
 * Shows a live composite script that updates as the conversation progresses.
 * Offers "Copy Script" and "Save to Request" actions.
 */
export const TestBuilderPreview = ({ tabId, isComplete }: TestBuilderPreviewProps) => {
  const tests = useTestBuilderStore((s) => s.getTests(tabId));
  const compositeScript = useTestBuilderStore((s) => s.getCompositeScript(tabId));

  // Deduplicate by name for the chip display
  const deduped = new Map<string, GeneratedConvTest>();
  for (const t of tests) deduped.set(t.name, t);
  const uniqueTests = Array.from(deduped.values());

  const handleCopy = useCallback(() => {
    if (!compositeScript) return;
    navigator.clipboard.writeText(compositeScript).then(() => {
      toast.success(`Copied ${uniqueTests.length} test scripts to clipboard`);
    });
  }, [compositeScript, uniqueTests.length]);

  const handleSave = useCallback(() => {
    if (!compositeScript) return;
    const store = useTestRunnerStore.getState();
    store.setScript(tabId, compositeScript);
    toast.success(`${uniqueTests.length} tests saved to request — run them from the Tests tab`);
  }, [compositeScript, tabId, uniqueTests.length]);

  if (uniqueTests.length === 0) {
    return (
      <div className={styles.preview}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <TestTube size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <span className={styles.headerTitle}>Test Preview</span>
          </div>
        </div>
        <div className={styles.empty}>
          <TestTube size={32} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No tests yet</p>
          <p className={styles.emptyHint}>
            Describe what you want to test in the chat and AI will generate
            <br />
            ready-to-run atx.test() scripts here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.preview}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TestTube size={14} style={{ color: 'var(--color-primary)' }} />
          <span className={styles.headerTitle}>Generated Tests</span>
          <span className={styles.testCount}>{uniqueTests.length}</span>
          {isComplete && <span className={styles.completeBadge}>Suite Complete</span>}
        </div>
      </div>

      {/* Composite Script */}
      <div className={styles.codeWrapper}>
        <pre className={styles.codeBlock}>{compositeScript}</pre>
      </div>

      {/* Category Chips */}
      <div className={styles.testChips}>
        {uniqueTests.map((t, i) => (
          <span
            key={i}
            className={`${styles.chip} ${styles[`chip-${t.category}`] || styles['chip-edge_case']}`}
            title={t.name}
          >
            {CATEGORY_LABELS[t.category] ?? t.category}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.copyBtn} onClick={handleCopy} type="button">
          <Copy size={12} />
          Copy Script
        </button>
        <button className={styles.saveBtn} onClick={handleSave} type="button">
          <Save size={12} />
          Save to Request
        </button>
      </div>
    </div>
  );
};
