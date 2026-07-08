import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './DiffCategory.module.css';

type CategoryType = 'breaking' | 'deprecation' | 'drift' | 'enhancement';

const COUNT_CLS: Record<CategoryType, string> = {
  breaking:    styles['countBreaking'] as string,
  deprecation: styles['countDeprecation'] as string,
  drift:       styles['countDrift'] as string,
  enhancement: styles['countEnhancement'] as string,
};

interface DiffCategoryProps {
  type: CategoryType;
  title: string;
  icon: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * DiffCategory — collapsible section for one category of API changes.
 * Auto-expands when it has items; breaking changes default open.
 */
export const DiffCategory = ({
  type,
  title,
  icon,
  count,
  defaultOpen = false,
  children,
}: DiffCategoryProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || count > 0);

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => setIsOpen((o) => !o)}
        type="button"
        aria-expanded={isOpen}
      >
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{title}</span>
        <span className={`${styles.count} ${COUNT_CLS[type] ?? ''}`}>{count}</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.body}>
          {count === 0 ? (
            <p className={styles.empty}>No {title.toLowerCase()} detected</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
};
