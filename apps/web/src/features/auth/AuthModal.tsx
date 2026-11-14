import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthModal.module.css';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    signup,
    teacher,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (authModalMode === 'signin') {
        if (!email.trim()) {
          setError('Please provide a valid school email address.');
          setSubmitting(false);
          return;
        }
        const success = await login(email, password);
        if (!success) {
          setError('Invalid credentials or unrecognized email address.');
        }
      } else {
        if (!name.trim() || !email.trim() || !school.trim()) {
          setError('All fields are required to register a school account.');
          setSubmitting(false);
          return;
        }
        const success = await signup(name, email, school, password);
        if (!success) {
          setError('Failed to create account. Email may already be registered.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => teacher && setIsAuthModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.brandRow}>
            <span className={styles.brandBadge}>HourBack School Platform</span>
          </div>
          <h2 className={styles.title}>
            {authModalMode === 'signin' ? 'Educator Sign In' : 'Register Educator Account'}
          </h2>
          <p className={styles.subtitle}>
            {authModalMode === 'signin'
              ? 'Access class gradebooks, student portfolios, and report comments'
              : 'Create your classroom portal account with zero administrative overhead'}
          </p>
          <button
            className={styles.closeButton}
            onClick={() => teacher && setIsAuthModalOpen(false)}
            disabled={!teacher}
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.tabNav}>
          <button
            type="button"
            className={`${styles.tab} ${authModalMode === 'signin' ? styles.activeTab : ''}`}
            onClick={() => {
              setAuthModalMode('signin');
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`${styles.tab} ${authModalMode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => {
              setAuthModalMode('signup');
              setError(null);
            }}
          >
            Create Account
          </button>
        </div>

        <div className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            {authModalMode === 'signup' && (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>School / Academy Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. Oakridge International School"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Institutional Email</label>
              <input
                type="email"
                className={styles.input}
                placeholder="educator@school.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder={authModalMode === 'signup' ? 'At least 12 characters' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={authModalMode === 'signup' ? 12 : 1}
                maxLength={128}
                autoComplete={authModalMode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              {authModalMode === 'signup' && (
                <span className={styles.label}>Use at least 12 characters. Your password is stored as a salted hash.</span>
              )}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting
                ? 'Authenticating...'
                : authModalMode === 'signin'
                ? 'Sign In to Portal'
                : 'Register & Launch Classroom'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
