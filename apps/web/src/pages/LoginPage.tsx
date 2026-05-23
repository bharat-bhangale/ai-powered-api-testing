import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import styles from './AuthPages.module.css';

/**
 * Login page — email + password form with glassmorphism card.
 */
export const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        axiosError.response?.data?.error?.message || 'Login failed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.gradientOrb1} />
      <div className={styles.gradientOrb2} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Zap size={24} />
          </div>
          <h1 className={styles.logoText}>ATX</h1>
          <p className={styles.logoSub}>AI-Powered API Testing</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>Sign in to your account</p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>
              Email
            </label>
            <input
              id="login-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>
              Password
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className={styles.spinner} />
            ) : (
              'Sign In'
            )}
          </button>

          <p className={styles.switchText}>
            Don&apos;t have an account?{' '}
            <Link to="/register" className={styles.switchLink}>
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
