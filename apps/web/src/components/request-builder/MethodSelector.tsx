import { useState, useRef, useEffect } from 'react';
import type { HttpMethod } from '@/stores/requestStore';
import styles from './MethodSelector.module.css';

interface MethodSelectorProps {
  method: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'var(--color-method-get)',
  POST: 'var(--color-method-post)',
  PUT: 'var(--color-method-put)',
  PATCH: 'var(--color-method-patch)',
  DELETE: 'var(--color-method-delete)',
  HEAD: 'var(--color-method-head)',
  OPTIONS: 'var(--color-method-options)',
};

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const MethodSelector = ({ method, onChange }: MethodSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.trigger}
        style={{ color: METHOD_COLORS[method] }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select HTTP method"
        type="button"
      >
        {method}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className={styles.dropdown}>
          {METHODS.map((m) => (
            <li key={m}>
              <button
                className={`${styles.option} ${m === method ? styles.active : ''}`}
                style={{ color: METHOD_COLORS[m] }}
                onClick={() => {
                  onChange(m);
                  setIsOpen(false);
                }}
                type="button"
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
