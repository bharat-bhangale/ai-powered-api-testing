import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { ErrorBoundary } from './ErrorBoundary';
import { AppRouter } from './router';
import { isDesktopRuntime, waitForDesktopApiReady } from '@/services/desktop.service';
import { setApiBaseUrl } from '@/services/api';
import type { AppInitState } from '@/types/desktop';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ===== Startup splash (shown while desktop API URL is resolving) =====

const InitScreen = ({ message }: { message: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-base, #0f0f13)',
      color: 'var(--color-text-secondary, #8b8fa8)',
      fontFamily: 'Inter, system-ui, sans-serif',
      gap: '1rem',
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        border: '3px solid var(--color-border, #2a2a3a)',
        borderTopColor: 'var(--color-primary, #6366f1)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <p style={{ margin: 0, fontSize: 14 }}>{message}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ErrorScreen = ({ message }: { message: string }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-base, #0f0f13)',
      color: 'var(--color-error, #f87171)',
      fontFamily: 'Inter, system-ui, sans-serif',
      gap: '0.75rem',
    }}
  >
    <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Failed to start</p>
    <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{message}</p>
  </div>
);

// ===== Root Application =====

/**
 * Root application component.
 *
 * Initialization flow:
 *   Web mode (no window.atxDesktop)
 *     → Skip async init entirely; baseURL already set in api.ts.
 *     → Use BrowserRouter (HTML5 history).
 *
 *   Desktop mode (window.atxDesktop present)
 *     → Show splash screen.
 *     → Await waitForDesktopApiReady() to get the local API URL.
 *     → Call setApiBaseUrl() so Axios is wired before any render.
 *     → Switch to HashRouter (works with file:// protocol in packaged builds).
 *     → Render the app; ProtectedRoute auto-passes (no auth wall).
 */
export const App = () => {
  const { resolvedTheme } = useTheme();

  const desktop = isDesktopRuntime();

  // In web mode init is synchronous — start as 'ready'
  const [initState, setInitState] = useState<AppInitState>(() => {
    if (!desktop) {
      return { status: 'ready', apiBaseUrl: '' };
    }
    return { status: 'idle', apiBaseUrl: '' };
  });

  useEffect(() => {
    if (!desktop) return;

    let cancelled = false;
    setInitState({ status: 'resolving', apiBaseUrl: '' });

    waitForDesktopApiReady(60_000)
      .then((url) => {
        if (cancelled) return;
        setApiBaseUrl(url);
        setInitState({ status: 'ready', apiBaseUrl: url });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setInitState({ status: 'error', apiBaseUrl: '', errorMessage: msg });
      });

    return () => {
      cancelled = true;
    };
  }, [desktop]);

  // ===== Render gates =====

  if (initState.status === 'idle' || initState.status === 'resolving') {
    return <InitScreen message="Starting local API server…" />;
  }

  if (initState.status === 'error') {
    return (
      <ErrorScreen
        message={initState.errorMessage ?? 'Unknown initialization error'}
      />
    );
  }

  // ===== Router selection =====
  // Desktop packaged builds load via file://, which requires HashRouter.
  // Web mode uses BrowserRouter for clean URLs.
  const Router = desktop ? HashRouter : BrowserRouter;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRouter />
          <Toaster
            position="bottom-right"
            theme={resolvedTheme}
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
              },
            }}
            richColors
            closeButton
            visibleToasts={3}
          />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
