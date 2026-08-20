'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../lib/api-client';
import styles from '../../styles/Auth.module.css';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.push(returnUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.problem?.detail || err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected login error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.authCard}>
      <header className={styles.brandHeader}>
        <Link href="/" className={styles.brandLogo} aria-label="Cinely Home">
          <span>CINE<span className={styles.brandAccent}>LY</span></span>
        </Link>
        <h1 className={styles.authTitle}>Sign In</h1>
        <p className={styles.authSubtitle}>Access your watchlist, progress, and decentralized streams.</p>
      </header>

      {errorMessage && (
        <div className={styles.errorAlert} role="alert">
          {errorMessage}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className={styles.input}
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className={styles.footerText}>
        New to Cinely?
        <Link href="/register" className={styles.footerLink}>
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.authContainer}>
      <Suspense fallback={<div className={styles.authCard} />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
