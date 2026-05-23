import { Routes, Route, Navigate } from 'react-router-dom';
import { RequestBuilder } from '@/components/request-builder/RequestBuilder';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

/**
 * Application router and main layout.
 * Structure: TopBar → Content → StatusBar
 */
export const AppRouter = () => {
  useKeyboardShortcuts();

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <TopBar />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<RequestBuilder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <StatusBar />
    </div>
  );
};
