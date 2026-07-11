import { useState, useEffect } from 'react';
import { X, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/api';
import { DataPresets, type DataPreset } from './DataPresets';
import styles from './DataGenerator.module.css';

interface DataVariation {
  name: string;
  body: Record<string, unknown>;
  description: string;
}

interface DataGenResult {
  generatedBody: Record<string, unknown>;
  explanation: string;
  variations: DataVariation[];
}

interface DataGeneratorProps {
  isOpen: boolean;
  method: string;
  url: string;
  /** Current body JSON string (from body editor) */
  currentBody: string;
  onApply: (jsonBody: string) => void;
  onClose: () => void;
}

type State = 'idle' | 'loading' | 'done' | 'error';

/**
 * DataGenerator — slide-in drawer for AI Smart Data Generation.
 *
 * Flow:
 * 1. Parse current body → extract field structure
 * 2. Send to /api/ai/generate-data with selected preset
 * 3. Show generated body with Apply button + 3 variation cards
 */
export const DataGenerator = ({ isOpen, method, url, currentBody, onApply, onClose }: DataGeneratorProps) => {
  const [preset, setPreset] = useState<DataPreset>('happy_path');
  const [customInstruction, setCustomInstruction] = useState('');
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<DataGenResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset on close
  useEffect(() => { if (!isOpen) { setState('idle'); setResult(null); setErrorMsg(''); } }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Parse current body to extract field structure
  const parseBodyStructure = (): Record<string, unknown> => {
    try {
      const parsed = JSON.parse(currentBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { /* fallback */ }
    return {};
  };

  const handleGenerate = async () => {
    const bodyStructure = parseBodyStructure();
    if (Object.keys(bodyStructure).length === 0) {
      toast.warning('Add some fields to the body first, then generate data');
      return;
    }

    setState('loading');
    setErrorMsg('');
    try {
      const resp = await apiClient.post('/api/ai/generate-data', {
        bodyStructure,
        method,
        url,
        preset,
        customInstruction: customInstruction.trim() || undefined,
      });
      setResult(resp.data.data as DataGenResult);
      setState('done');
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Data generation failed';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const applyBody = (body: Record<string, unknown>) => {
    onApply(JSON.stringify(body, null, 2));
    toast.success('Generated data applied to request body');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Sparkles size={20} className={styles.headerIcon} />
            <div>
              <h3 className={styles.headerTitle}>AI Smart Data Generator</h3>
              <div className={styles.headerSub}>Contextually intelligent test data</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button"><X size={16} /></button>
        </div>

        {/* Preset selector */}
        <div className={styles.presetsRow}>
          <DataPresets selected={preset} onChange={(p) => { setPreset(p); setResult(null); }} disabled={state === 'loading'} />
        </div>

        {/* Custom instruction + generate button */}
        <div className={styles.customRow}>
          <input
            className={styles.customInput}
            placeholder="Optional: additional instruction (e.g. 'make it a premium user')"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleGenerate(); }}
            disabled={state === 'loading'}
          />
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={state === 'loading'}
            type="button"
          >
            {state === 'loading'
              ? <><span className={styles.loadingSpinner} style={{ width: 14, height: 14, borderWidth: 2 }} />Generating…</>
              : <><Sparkles size={13} />Generate</>
            }
          </button>
        </div>

        {/* Content */}
        {state === 'idle' && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎲</div>
            <p className={styles.emptyTitle}>Ready to generate data</p>
            <p className={styles.emptyHint}>
              AI will analyze your body fields and generate realistic, contextually coherent values.
              Select a preset above then click Generate.
            </p>
          </div>
        )}

        {state === 'loading' && (
          <div className={styles.loadingWrap}>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingText}>AI is generating contextual test data…</p>
          </div>
        )}

        {state === 'error' && (
          <div className={styles.content}>
            <div className={styles.errorBanner}>
              <AlertTriangle size={13} />
              {errorMsg}
            </div>
          </div>
        )}

        {state === 'done' && result && (
          <div className={styles.content}>
            {/* Explanation */}
            <div className={styles.explanation}>
              <Sparkles size={13} style={{ flexShrink: 0, marginTop: 1, color: 'hsl(280,80%,60%)' }} />
              {result.explanation}
            </div>

            {/* Generated body */}
            <div className={styles.bodySection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>Generated Body</span>
                <button
                  className={styles.applyBtn}
                  onClick={() => applyBody(result.generatedBody)}
                  type="button"
                >
                  <Check size={12} />
                  Apply to Request
                </button>
              </div>
              <pre className={styles.codeBlock}>{JSON.stringify(result.generatedBody, null, 2)}</pre>
            </div>

            {/* Variations */}
            {result.variations.length > 0 && (
              <div className={styles.bodySection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Variations</span>
                </div>
                <div className={styles.variationsGrid}>
                  {result.variations.map((v, i) => (
                    <div key={i} className={styles.variationCard}>
                      <div className={styles.variationHeader}>
                        <div>
                          <div className={styles.variationName}>{v.name}</div>
                          <div className={styles.variationDesc}>{v.description}</div>
                        </div>
                        <button
                          className={styles.variationUse}
                          onClick={() => applyBody(v.body)}
                          type="button"
                        >
                          Use this
                        </button>
                      </div>
                      <pre className={styles.variationCode}>{JSON.stringify(v.body, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
