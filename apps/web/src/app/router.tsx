import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RequestBuilder } from '@/components/request-builder/RequestBuilder';
import { CollectionRunner } from '@/components/collection-runner/CollectionRunner';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { useRequestStore } from '@/stores/requestStore';
import { OfflineBanner } from '@/components/common/OfflineBanner/OfflineBanner';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import styles from './router.module.css';

/**
 * Protected route wrapper — redirects to /login if not authenticated.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Public route wrapper — redirects to / if already authenticated.
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Main App layout — TopBar + Sidebar + RequestBuilder + StatusBar
 */
const MainApp = () => {
  useKeyboardShortcuts();
  const fetchEnvironments = useEnvironmentStore((s) => s.fetchEnvironments);
  const activeTabId = useRequestStore((s) => s.activeTabId);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  return (
    <div className={styles.appLayout}>
      <OfflineBanner />
      <TopBar />
      <div className={styles.mainContent}>
        <Sidebar />
        <main className={styles.workArea}>
          {activeTabId ? <RequestBuilder /> : <CollectionRunner />}
        </main>
        <AIChatPanel />
      </div>
      <StatusBar />
    </div>
  );
};

/**
 * Application router.
 * - /login and /register are public
 * - / is protected (requires auth)
 * - Runs checkAuth on mount to verify session
 */
export const AppRouter = () => {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes location={location}>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
