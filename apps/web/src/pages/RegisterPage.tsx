import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import styles from './AuthPages.module.css';

/**
 * Register page — name + email + password form with glassmorphism card.
 */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, name, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        axiosError.response?.data?.error?.message || 'Registration failed. Please try again.',
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
          <h2 className={styles.title}>Create account</h2>
          <p className={styles.subtitle}>Get started with ATX</p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label htmlFor="register-name" className={styles.label}>
              Full Name
            </label>
            <input
              id="register-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>
              Email
            </label>
            <input
              id="register-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="register-password" className={styles.label}>
              Password
            </label>
            <input
              id="register-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
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
              'Create Account'
            )}
          </button>

          <p className={styles.switchText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.switchLink}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
