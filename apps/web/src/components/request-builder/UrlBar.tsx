import { useRef } from 'react';
import { MethodSelector } from './MethodSelector';
import { VariableInput } from '@/components/common/VariableInput';
import type { HttpMethod } from '@/stores/requestStore';
import styles from './UrlBar.module.css';

interface UrlBarProps {
  method: HttpMethod;
  url: string;
  isLoading: boolean;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
}

export const UrlBar = ({
  method,
  url,
  isLoading,
  onMethodChange,
  onUrlChange,
  onSend,
}: UrlBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className={styles.urlBar}>
      <MethodSelector method={method} onChange={onMethodChange} />

      <VariableInput
        id="url-input"
        className={styles.urlInput}
        value={url}
        onChange={onUrlChange}
        placeholder="Enter request URL or paste cURL"
      />

      <button
        id="send-button"
        className={styles.sendButton}
        onClick={onSend}
        disabled={isLoading || !url.trim()}
        aria-label="Send request (Ctrl+Enter)"
        type="button"
      >
        {isLoading ? <span className={styles.spinner} /> : 'Send'}
      </button>
    </div>
  );
};
