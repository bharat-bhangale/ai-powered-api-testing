import { useRef, useCallback } from 'react';
import { MethodSelector } from './MethodSelector';
import { VariableInput } from '@/components/common/VariableInput';
import { parseCurl } from '@/utils/curl-parser';
import { toast } from 'sonner';
import { useRequestStore } from '@/stores/requestStore';
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
  const { updateHeaders, updateParams, updateBody, updateAuth } = useRequestStore();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSend();
    }
  };

  // Detect cURL paste in the URL bar
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData('text');
      if (text.trim().toLowerCase().startsWith('curl ')) {
        e.preventDefault();
        try {
          const parsed = parseCurl(text);
          onMethodChange(parsed.method as HttpMethod);
          onUrlChange(parsed.url);
          updateHeaders(parsed.headers);
          updateParams(parsed.params);
          updateBody(parsed.body);
          updateAuth(parsed.auth as Parameters<typeof updateAuth>[0]);
          toast.success('cURL command imported successfully');
        } catch {
          toast.error('Failed to parse cURL command');
        }
      }
    },
    [onMethodChange, onUrlChange, updateHeaders, updateParams, updateBody, updateAuth],
  );

  return (
    <div className={styles.urlBar} onPaste={handlePaste} onKeyDown={handleKeyDown}>
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
