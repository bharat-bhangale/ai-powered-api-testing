import { useState, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Wand2, X } from 'lucide-react';
import styles from './NLRequestBar.module.css';

const MAX_LENGTH = 500;

interface NLRequestBarProps {
  isExpanded: boolean;
  isGenerating: boolean;
  onToggle: () => void;
  onGenerate: (text: string) => void;
}

/**
 * NLRequestBar — collapsible input bar for natural language API request generation.
 *
 * Collapsed: shows a sparkle pill button.
 * Expanded:  shows a glowing input with generate + close buttons.
 * Keyboard:  Enter = generate, Escape = collapse.
 */
export const NLRequestBar = ({
  isExpanded,
  isGenerating,
  onToggle,
  onGenerate,
}: NLRequestBarProps) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (text.trim() && !isGenerating) {
          onGenerate(text);
        }
      }
      if (e.key === 'Escape') {
        setText('');
        onToggle();
      }
    },
    [text, isGenerating, onGenerate, onToggle],
  );

  const handleGenerate = useCallback(() => {
    if (text.trim() && !isGenerating) {
      onGenerate(text);
    }
  }, [text, isGenerating, onGenerate]);

  const handleClose = useCallback(() => {
    setText('');
    onToggle();
  }, [onToggle]);

  const charCount = text.length;
  const nearLimit = charCount > 400;

  if (!isExpanded) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.triggerRow}>
          <button
            className={styles.triggerBtn}
            onClick={onToggle}
            title="Generate request from description (Ctrl+Shift+A)"
            type="button"
            id="nl-request-trigger-btn"
          >
            <Sparkles size={12} className={styles.triggerIcon} />
            AI Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        {isGenerating ? (
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
            <span>AI is building your request...</span>
          </div>
        ) : (
          <Sparkles size={14} className={styles.sparkleIcon} />
        )}

        <input
          ref={inputRef}
          id="nl-request-input"
          className={styles.nlInput}
          type="text"
          placeholder="✨ Describe your API request in plain English..."
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
        />

        {!isGenerating && (
          <>
            <span className={`${styles.charCount} ${nearLimit ? styles.nearLimit : ''}`}>
              {charCount}/{MAX_LENGTH}
            </span>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={!text.trim()}
              type="button"
              id="nl-request-generate-btn"
            >
              <Wand2 size={12} />
              Generate
            </button>

            <button
              className={styles.closeBtn}
              onClick={handleClose}
              title="Close (Escape)"
              type="button"
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
