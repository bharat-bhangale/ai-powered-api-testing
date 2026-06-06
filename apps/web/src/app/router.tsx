import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useEnvironmentStore } from '@/stores/environmentStore';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RequestBuilder } from '@/components/request-builder/RequestBuilder';
import { CollectionRunner } from '@/components/collection-runner/CollectionRunner';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { useRequestStore } from '@/stores/requestStore';
import { OfflineBanner } from '@/components/common/OfflineBanner/OfflineBanner';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { isDesktopRuntime } from '@/services/desktop.service';
import styles from './router.module.css';

/**
 * Protected route wrapper.
 * - Desktop mode: always renders children (no login wall).
 * - Web mode: redirects to /login if not authenticated.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Desktop: no auth wall — render immediately
  if (isDesktopRuntime()) {
    return <>{children}</>;
  }

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
 * Public route wrapper.
 * - Desktop mode: never redirects away (no auth wall).
 * - Web mode: redirects to / if already authenticated.
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  // Desktop: no auth concept — always render the public content
  if (isDesktopRuntime()) {
    return <>{children}</>;
  }

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
  const location = useLocation();

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  const isDashboard = location.pathname === '/dashboard';
  const isSettings = location.pathname === '/settings';

  return (
    <div className={styles.appLayout}>
      <OfflineBanner />
      <TopBar />
      <div className={styles.mainContent}>
        <Sidebar />
        <main className={styles.workArea}>
          {isSettings ? (
            <SettingsPage />
          ) : isDashboard ? (
            <DashboardPage />
          ) : activeTabId ? (
            <RequestBuilder />
          ) : (
            <CollectionRunner />
          )}
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
 * - / is protected (requires auth in web; always accessible in desktop)
 * - Runs checkAuth on mount in web mode only
 */
export const AppRouter = () => {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const location = useLocation();

  useEffect(() => {
    // checkAuth handles both modes:
    // - Desktop: fetches /api/auth/me to hydrate the local user (no redirect)
    // - Web: performs JWT refresh + /api/auth/me session check
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
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
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
