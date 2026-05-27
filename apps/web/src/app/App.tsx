import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { ErrorBoundary } from './ErrorBoundary';
import { AppRouter } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Root application component — wraps everything in ErrorBoundary,
 * QueryClientProvider, BrowserRouter, and Toaster (theme-aware).
 */
export const App = () => {
  const { resolvedTheme } = useTheme();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
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
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
