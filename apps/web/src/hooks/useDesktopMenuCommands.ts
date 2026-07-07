import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDesktopRuntime } from '@/services/desktop.service';
import { useRequestStore } from '@/stores/requestStore';
import { useAIStore } from '@/stores/aiStore';

export function useDesktopMenuCommands() {
  const navigate = useNavigate();
  const addTab = useRequestStore((s) => s.addTab);
  const toggleAIPanel = useAIStore((s) => s.togglePanel);

  useEffect(() => {
    if (!isDesktopRuntime() || !window.atxDesktop) return;

    const unsubscribe = window.atxDesktop.onMenuCommand((command) => {
      switch (command) {
        case 'NEW_REQUEST':
          addTab();
          break;
        case 'NEW_COLLECTION':
          // We can't directly trigger the modal from here easily without a global store for it, 
          // but we can navigate to dashboard where collections live, or we could add a trigger.
          navigate('/');
          break;
        case 'OPEN_SETTINGS':
          navigate('/settings');
          break;
        case 'IMPORT_POSTMAN':
          navigate('/');
          break;
        case 'TOGGLE_AI':
          toggleAIPanel();
          break;
        default:
          console.log('Unknown menu command:', command);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [navigate, addTab, toggleAIPanel]);
}
