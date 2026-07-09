import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Vulnerability } from '@/types/security';
import styles from './SecurityReportCard.module.css';

type Severity = Vulnerability['severity'];

const SEVERITY_CARD: Record<Severity, string> = {
  critical: styles['critical'] as string,
  high:     styles['high'] as string,
  medium:   styles['medium'] as string,
  low:      styles['low'] as string,
  info:     styles['info'] as string,
};

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: styles['badgeCritical'] as string,
  high:     styles['badgeHigh'] as string,
  medium:   styles['badgeMedium'] as string,
  low:      styles['badgeLow'] as string,
  info:     styles['badgeInfo'] as string,
};

interface SecurityReportCardProps {
  vulnerability: Vulnerability;
  defaultOpen?: boolean;
}

/**
 * SecurityReportCard — collapsible card for one OWASP vulnerability finding.
 * Shows: OWASP badge, severity, title (collapsed), then full details when expanded.
 */
export const SecurityReportCard = ({ vulnerability, defaultOpen = false }: SecurityReportCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${styles.card} ${SEVERITY_CARD[vulnerability.severity] ?? ''}`}>
      {/* Header */}
      <button
        className={styles.header}
        onClick={() => setIsOpen((o) => !o)}
        type="button"
        aria-expanded={isOpen}
      >
        <div className={styles.headerLeft}>
          <span className={styles.owaspBadge}>{vulnerability.owaspCategory}</span>
          <span className={styles.title}>{vulnerability.title}</span>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.severityBadge} ${SEVERITY_BADGE[vulnerability.severity] ?? ''}`}>
            {vulnerability.severity}
          </span>
          <ChevronDown
            size={14}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        </div>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div className={styles.body}>
          {/* Endpoint */}
          <code className={styles.endpoint}>{vulnerability.endpoint}</code>

          {/* Description */}
          <div>
            <div className={styles.sectionLabel}>Description</div>
            <p className={styles.sectionText}>{vulnerability.description}</p>
          </div>

          {/* Evidence */}
          <div className={styles.evidence}>
            <div className={styles.sectionLabel}>Evidence</div>
            <p className={styles.sectionText}>{vulnerability.evidence}</p>
          </div>

          {/* Remediation */}
          <div className={styles.remediation}>
            <div className={styles.sectionLabel}>Remediation</div>
            <p className={styles.sectionText}>{vulnerability.remediation}</p>
          </div>

          {/* Code example */}
          {vulnerability.codeExample && (
            <div>
              <div className={styles.sectionLabel}>Code Example</div>
              <pre className={styles.codeBlock}>{vulnerability.codeExample}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
