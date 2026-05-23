import { useEffect } from 'react';

/**
 * Global keyboard shortcuts.
 * Registers keydown listeners for common operations.
 * Does not trigger when focused inside Monaco editor or other input fields
 * that handle their own key bindings.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;

      // Don't intercept shortcuts inside Monaco editor or contentEditable
      if (target.closest('.monaco-editor') || target.isContentEditable) {
        return;
      }

      // Ctrl+Enter → Send request
      if (ctrl && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('send-button')?.click();
      }

      // Ctrl+S → Save request
      if (ctrl && e.key === 's') {
        e.preventDefault();
        document.getElementById('save-button')?.click();
      }

      // Ctrl+N → New tab
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        document.getElementById('new-tab-button')?.click();
      }

      // Ctrl+W → Close current tab
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        document.getElementById('close-tab-button')?.click();
      }

      // Ctrl+L → Focus URL bar
      if (ctrl && e.key === 'l') {
        e.preventDefault();
        document.getElementById('url-input')?.focus();
      }

      // Ctrl+Shift+I → Toggle AI panel
      if (ctrl && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        document.getElementById('ai-toggle-button')?.click();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
