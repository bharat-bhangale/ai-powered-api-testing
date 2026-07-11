import { Check, Sparkles } from 'lucide-react';
import {
  useFuzzStore,
  CATEGORY_LABELS,
  type FuzzCategory,
} from '@/stores/fuzzStore';
import styles from './FuzzCategorySelector.module.css';

// Approximate payload count per category
const CATEGORY_COUNT: Record<FuzzCategory, number> = {
  boundary:       15,
  type_confusion: 13,
  injection:      15,
  xss:            10,
  unicode:        10,
  format:         13,
  size:            7,
};

const ALL_CATEGORIES: FuzzCategory[] = [
  'boundary', 'type_confusion', 'injection', 'xss', 'unicode', 'format', 'size',
];

/**
 * FuzzCategorySelector — checkbox grid of fuzz categories + AI toggle.
 */
export const FuzzCategorySelector = () => {
  const { selectedCategories, useAiPayloads, setCategory, setUseAiPayloads } = useFuzzStore();

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Fuzz Categories</div>

      <div className={styles.grid}>
        {ALL_CATEGORIES.map((cat) => {
          const active = selectedCategories.includes(cat);
          return (
            <div
              key={cat}
              className={`${styles.item} ${active ? styles.itemActive : ''}`}
              onClick={() => setCategory(cat, !active)}
              role="checkbox"
              aria-checked={active}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setCategory(cat, !active); }}
            >
              <div className={`${styles.checkbox} ${active ? styles.checkboxChecked : ''}`}>
                {active && <Check size={9} color="white" />}
              </div>
              <span className={`${styles.label} ${active ? styles.labelActive : ''}`}>
                {CATEGORY_LABELS[cat]}
              </span>
              <span className={styles.count}>{CATEGORY_COUNT[cat]}</span>
            </div>
          );
        })}
      </div>

      {/* AI payloads toggle */}
      <div className={styles.aiRow} onClick={() => setUseAiPayloads(!useAiPayloads)}>
        <span className={styles.aiLabel}>
          <Sparkles size={12} />
          AI contextual payloads (field-semantic attacks)
        </span>
        <div className={`${styles.toggle} ${useAiPayloads ? styles.toggleOn : ''}`}>
          <div className={styles.toggleKnob} />
        </div>
      </div>
    </div>
  );
};
