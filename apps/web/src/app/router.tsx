import { Routes, Route, Navigate } from 'react-router-dom';
import { RequestBuilder } from '@/components/request-builder/RequestBuilder';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * Application router.
 * Registers global keyboard shortcuts and renders the main layout.
 */
export const AppRouter = () => {
  useKeyboardShortcuts();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/" element={<RequestBuilder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};
