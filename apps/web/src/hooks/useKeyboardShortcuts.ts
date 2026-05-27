import { useEffect } from 'react';
import { useRequestStore } from '@/stores/requestStore';
import { useAIStore } from '@/stores/aiStore';

/**
 * Global keyboard shortcuts.
 * Registers keydown listeners for common operations.
 * Does not trigger when focused inside Monaco editor or contentEditable.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
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
      if (ctrl && !shift && e.key === 's') {
        e.preventDefault();
        document.getElementById('save-button')?.click();
      }

      // Ctrl+N → New tab
      if (ctrl && e.key === 'n') {
        e.preventDefault();
        useRequestStore.getState().addTab();
      }

      // Ctrl+W → Close current tab
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        const state = useRequestStore.getState();
        if (state.activeTabId && state.tabs.length > 1) {
          state.closeTab(state.activeTabId);
        }
      }

      // Ctrl+Tab → Switch to next tab
      if (ctrl && !shift && e.key === 'Tab') {
        e.preventDefault();
        const state = useRequestStore.getState();
        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId);
        const nextIdx = (currentIdx + 1) % state.tabs.length;
        const nextTab = state.tabs[nextIdx];
        if (nextTab) state.setActiveTab(nextTab.id);
      }

      // Ctrl+Shift+Tab → Switch to previous tab
      if (ctrl && shift && e.key === 'Tab') {
        e.preventDefault();
        const state = useRequestStore.getState();
        const currentIdx = state.tabs.findIndex((t) => t.id === state.activeTabId);
        const prevIdx = (currentIdx - 1 + state.tabs.length) % state.tabs.length;
        const prevTab = state.tabs[prevIdx];
        if (prevTab) state.setActiveTab(prevTab.id);
      }

      // Ctrl+L → Focus URL bar
      if (ctrl && e.key === 'l') {
        e.preventDefault();
        document.getElementById('url-input')?.focus();
      }

      // Ctrl+Shift+I → Toggle AI panel
      if (ctrl && shift && e.key === 'I') {
        e.preventDefault();
        useAIStore.getState().togglePanel();
      }

      // Ctrl+E → Toggle environment selector
      if (ctrl && e.key === 'e') {
        e.preventDefault();
        document.getElementById('env-selector-button')?.click();
      }

      // Ctrl+H → Toggle history panel
      if (ctrl && e.key === 'h') {
        e.preventDefault();
        document.getElementById('history-toggle-button')?.click();
      }

      // Ctrl+Shift+C → Copy response as cURL
      if (ctrl && shift && e.key === 'C') {
        e.preventDefault();
        document.getElementById('copy-curl-button')?.click();
      }

      // Escape → Close any open modal/dropdown
      if (e.key === 'Escape') {
        const modal = document.querySelector('[data-modal-overlay]') as HTMLElement;
        if (modal) {
          modal.click();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
