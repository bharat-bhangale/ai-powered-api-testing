import { useState, useRef, useEffect, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { useEnvironmentStore } from '@/stores/environmentStore';
import styles from './VariableInput.module.css';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  spellCheck?: boolean;
  id?: string;
}

interface Suggestion {
  name: string;
  value: string;
}

/**
 * VariableInput — wraps a standard <input> with {{variable}} auto-complete.
 * When user types "{{", shows a dropdown of available variables from active environment.
 * Arrow keys navigate, Enter/click selects, Escape closes.
 */
export const VariableInput = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
  spellCheck = false,
  id,
}: VariableInputProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const variableNames = useEnvironmentStore((s) => s.getVariableNames());
  const activeVars = useEnvironmentStore((s) => s.getActiveVariables());

  // Build suggestions list
  const suggestions: Suggestion[] = variableNames
    .filter((name) => name.toLowerCase().includes(filter.toLowerCase()))
    .map((name) => ({ name, value: activeVars[name] || '' }));

  // Detect {{ pattern in input
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const pos = e.target.selectionStart || 0;
      onChange(newValue);
      setCursorPos(pos);

      // Check for {{ pattern before cursor
      const textBeforeCursor = newValue.substring(0, pos);
      const lastOpen = textBeforeCursor.lastIndexOf('{{');
      const lastClose = textBeforeCursor.lastIndexOf('}}');

      if (lastOpen > -1 && lastOpen > lastClose) {
        // We're inside a {{ ... pattern
        const partial = textBeforeCursor.substring(lastOpen + 2);
        setFilter(partial);
        setShowDropdown(true);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
      }
    },
    [onChange],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (selected) selectVariable(selected.name);
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    },
    [showDropdown, suggestions, selectedIndex],
  );

  // Insert variable at cursor position
  const selectVariable = useCallback(
    (varName: string) => {
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastOpen = textBeforeCursor.lastIndexOf('{{');
      const after = value.substring(cursorPos);

      // Replace from {{ to cursor with {{varName}}
      const newValue = value.substring(0, lastOpen) + `{{${varName}}}` + after;
      onChange(newValue);
      setShowDropdown(false);

      // Restore focus
      setTimeout(() => {
        const newPos = lastOpen + varName.length + 4; // length of {{varName}}
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [value, cursorPos, onChange],
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  // Has {{variables}} in the value?
  const hasVariables = /\{\{[^{}]+\}\}/.test(value);

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        id={id}
        className={`${styles.input} ${hasVariables ? styles.hasVariables : ''} ${className || ''}`}
        type={type}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={spellCheck}
        autoComplete="off"
      />

      {showDropdown && suggestions.length > 0 && (
        <div ref={dropdownRef} className={styles.dropdown}>
          {suggestions.map((s, i) => (
            <button
              key={s.name}
              className={`${styles.suggestion} ${i === selectedIndex ? styles.suggestionActive : ''}`}
              onClick={() => selectVariable(s.name)}
              type="button"
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className={styles.varName}>{`{{${s.name}}}`}</span>
              <span className={styles.varPreview}>{s.value.substring(0, 40)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
