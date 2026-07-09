import styles from './DataPresets.module.css';

export type DataPreset = 'happy_path' | 'edge_cases' | 'international' | 'minimal' | 'maximum';

interface PresetDef {
  id: DataPreset;
  emoji: string;
  label: string;
  description: string;
  cls: string;
}

const PRESETS: PresetDef[] = [
  { id: 'happy_path',    emoji: '✅', label: 'Happy Path',    description: 'Valid, realistic data that passes validation', cls: styles['happy'] as string    },
  { id: 'edge_cases',    emoji: '⚠️', label: 'Edge Cases',    description: 'Boundary values, special chars (valid types)', cls: styles['edge'] as string     },
  { id: 'international', emoji: '🌍', label: 'International', description: 'Non-English names, international formats',      cls: styles['intl'] as string     },
  { id: 'minimal',       emoji: '🔹', label: 'Minimal',       description: 'Only required fields, smallest valid values',   cls: styles['minimal'] as string  },
  { id: 'maximum',       emoji: '🔶', label: 'Maximum',       description: 'All fields, long strings, large values',        cls: styles['maximum'] as string  },
];

interface DataPresetsProps {
  selected: DataPreset;
  onChange: (preset: DataPreset) => void;
  disabled?: boolean;
}

/**
 * DataPresets — horizontal pill selector for data generation presets.
 */
export const DataPresets = ({ selected, onChange, disabled = false }: DataPresetsProps) => (
  <div className={styles.wrap}>
    <span className={styles.label}>Preset:</span>
    {PRESETS.map((p) => (
      <button
        key={p.id}
        className={`${styles.preset} ${p.cls} ${selected === p.id ? styles.presetActive : ''}`}
        onClick={() => onChange(p.id)}
        disabled={disabled}
        title={p.description}
        type="button"
      >
        {p.emoji} {p.label}
      </button>
    ))}
  </div>
);
