import { Routes, Route, Navigate } from 'react-router-dom';

/**
 * Placeholder page — shown until the full MainApp is built (Day 1-2).
 */
const WelcomePage = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 'var(--space-4)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-sans)',
  }}>
    <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)' }}>
      ⚡ ATX — AI-Powered API Testing
    </h1>
    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-md)' }}>
      Project setup complete. Start building features!
    </p>
    <div style={{
      display: 'flex',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-4)',
    }}>
      {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((method) => (
        <span
          key={method}
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--color-bg-elevated)',
            color: `var(--color-method-${method.toLowerCase()})`,
            border: '1px solid var(--color-border)',
          }}
        >
          {method}
        </span>
      ))}
    </div>
  </div>
);

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
