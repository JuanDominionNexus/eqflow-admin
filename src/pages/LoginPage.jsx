import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPortalMode } from '../hooks/usePortalMode';

const portalMode = getPortalMode();
const isTherapist = portalMode === 'therapist';

const THERAPIST_FEATURES = [
  { icon: '👥', title: 'Client Management', desc: 'View and manage your connected clients in one place' },
  { icon: '📊', title: 'Emotional Insights', desc: 'Access shared emotional patterns and check-in data' },
  { icon: '🔒', title: 'Privacy-First', desc: 'Clients control what they share — full transparency' },
  { icon: '✉️', title: 'Easy Invitations', desc: 'Invite clients via email to connect with your practice' },
];

const passkeySupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

export default function LoginPage() {
  const { token, login, error, loading, twoFactorPending, verifyTwoFactor, verifyTwoFactorPasskey, loginWithPasskey, cancelTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(null);
  const savedName = isTherapist ? localStorage.getItem('therapist_name') : null;

  if (loading) return null;
  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result === true) {
      navigate('/', { replace: true });
    }
  };

  const handleTotpSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await verifyTwoFactor(totpCode);
    setSubmitting(false);
    if (success) {
      navigate('/', { replace: true });
    }
  };

  const handlePasskey2FA = async () => {
    setSubmitting(true);
    const success = await verifyTwoFactorPasskey();
    setSubmitting(false);
    if (success) {
      navigate('/', { replace: true });
    }
  };

  const handlePasskeyLogin = async () => {
    setSubmitting(true);
    const success = await loginWithPasskey();
    setSubmitting(false);
    if (success) {
      navigate('/', { replace: true });
    }
  };

  const handleCancelTwoFactor = () => {
    cancelTwoFactor();
    setTotpCode('');
  };

  if (isTherapist) {
    return (
      <div style={t.page}>
        <div style={t.container}>
          {/* Left brand panel */}
          <div style={t.leftPanel}>
            <div style={t.leftInner}>
              <div style={t.brand}>
                <div style={t.logoRow}>
                  <span style={t.logoText}>EQ Flow</span>
                  <span style={t.badge}>Therapist</span>
                </div>
                <p style={t.tagline}>Therapist Portal</p>
                <p style={t.taglineSub}>Monitor your clients' emotional patterns and support their growth journey.</p>
              </div>

              <div style={t.features}>
                {THERAPIST_FEATURES.map((f) => (
                  <div key={f.title} style={t.featureRow}>
                    <div style={t.featureIcon}>{f.icon}</div>
                    <div>
                      <div style={t.featureTitle}>{f.title}</div>
                      <div style={t.featureDesc}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div style={t.rightPanel}>
            <div style={t.formWrap}>
              {twoFactorPending ? (
                <>
                  <h1 style={t.welcomeTitle}>Two-factor authentication</h1>
                  <p style={t.welcomeSub}>Verify your identity to continue</p>
                  {error && <div style={{ ...t.error, marginBottom: 16 }}>{error}</div>}
                  {passkeySupported && (
                    <>
                      <button type="button" onClick={handlePasskey2FA} disabled={submitting} style={t.btn}>
                        {submitting ? 'Waiting...' : 'Use passkey'}
                      </button>
                      <div style={t.divider}><span style={t.dividerText}>or enter code</span></div>
                    </>
                  )}
                  <form onSubmit={handleTotpSubmit} style={t.form}>
                    <div style={t.inputGroup}>
                      <label style={t.inputLabel}>Authentication code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        style={{ ...t.input, textAlign: 'center', fontSize: 20, letterSpacing: 8, ...(focused === 'totp' ? t.inputFocused : {}) }}
                        onFocus={() => setFocused('totp')}
                        onBlur={() => setFocused(null)}
                        autoFocus={!passkeySupported}
                      />
                    </div>
                    <button type="submit" disabled={submitting || totpCode.length < 6} style={{ ...t.btn, background: 'rgba(245, 158, 11, 0.5)' }}>
                      {submitting ? 'Verifying...' : 'Verify code'}
                    </button>
                    <button type="button" onClick={handleCancelTwoFactor} style={t.linkBtn}>
                      Back to login
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h1 style={t.welcomeTitle}>{savedName ? `Welcome back, ${savedName}` : 'Welcome to EQ Flow'}</h1>
                  <p style={t.welcomeSub}>{savedName ? 'Sign in to your therapist account' : 'Sign in to get started'}</p>
                  {error && <div style={{ ...t.error, marginBottom: 16 }}>{error}</div>}
                  {passkeySupported && (
                    <>
                      <button type="button" onClick={handlePasskeyLogin} disabled={submitting} style={t.btn}>
                        {submitting ? 'Waiting...' : 'Sign in with passkey'}
                      </button>
                      <div style={t.divider}><span style={t.dividerText}>or</span></div>
                    </>
                  )}
                  <form onSubmit={handleSubmit} style={t.form}>
                    <div style={t.inputGroup}>
                      <label style={t.inputLabel}>Email</label>
                      <input
                        type="email"
                        placeholder="you@practice.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ ...t.input, ...(focused === 'email' ? t.inputFocused : {}) }}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        required
                        autoFocus={!passkeySupported}
                      />
                    </div>
                    <div style={t.inputGroup}>
                      <label style={t.inputLabel}>Password</label>
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ ...t.input, ...(focused === 'password' ? t.inputFocused : {}) }}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                        required
                      />
                    </div>
                    <button type="submit" disabled={submitting} style={t.btn}>
                      {submitting ? 'Signing in...' : 'Sign in'}
                    </button>
                  </form>
                </>
              )}

              <div style={t.footer}>
                <span style={t.footerIcon}>🛡️</span>
                <span style={t.footerText}>End-to-end encrypted. Your clients' data stays private.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Admin mode ──
  if (twoFactorPending) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <span style={styles.logo}>EQ Flow</span>
            <span style={styles.badge}>Admin</span>
          </div>
          <p style={styles.twoFactorLabel}>Two-factor authentication</p>
          {error && <div style={styles.error}>{error}</div>}
          {passkeySupported && (
            <button type="button" onClick={handlePasskey2FA} disabled={submitting} style={styles.btn}>
              {submitting ? 'Waiting...' : 'Use passkey'}
            </button>
          )}
          {passkeySupported && <div style={styles.divider}><span style={styles.dividerText}>or enter code</span></div>}
          <form onSubmit={handleTotpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...styles.input, textAlign: 'center', fontSize: 20, letterSpacing: 8 }}
              autoFocus={!passkeySupported}
            />
            <button type="submit" disabled={submitting || totpCode.length < 6} style={{ ...styles.btn, backgroundColor: 'var(--text-secondary, #666)' }}>
              {submitting ? 'Verifying...' : 'Verify code'}
            </button>
          </form>
          <button type="button" onClick={handleCancelTwoFactor} style={styles.linkBtn}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.logo}>EQ Flow</span>
          <span style={styles.badge}>Admin</span>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        {passkeySupported && (
          <>
            <button type="button" onClick={handlePasskeyLogin} disabled={submitting} style={styles.btn}>
              {submitting ? 'Waiting...' : 'Sign in with passkey'}
            </button>
            <div style={styles.divider}><span style={styles.dividerText}>or</span></div>
          </>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
            autoFocus={!passkeySupported}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" disabled={submitting} style={styles.btn}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Therapist portal styles ──

const t = {
  page: {
    minHeight: '100vh',
    background: '#0B0E14',
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
  },

  // Left panel
  leftPanel: {
    flex: '0 0 480px',
    background: 'linear-gradient(180deg, #1A1225 0%, #0F0A1A 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    borderRight: '1px solid rgba(245, 158, 11, 0.08)',
  },
  leftInner: {
    padding: '0 56px',
    maxWidth: 440,
    width: '100%',
  },
  brand: {
    marginBottom: 48,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: -1,
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1A1225',
    background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
    padding: '3px 10px',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: 22,
    fontWeight: 600,
    color: '#F5F3FF',
    margin: 0,
    marginBottom: 8,
  },
  taglineSub: {
    fontSize: 15,
    color: 'rgba(245, 243, 255, 0.5)',
    lineHeight: 1.6,
    margin: 0,
  },

  // Features
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  featureRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'rgba(245, 158, 11, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F5F3FF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: 'rgba(245, 243, 255, 0.45)',
    lineHeight: 1.5,
  },

  // Right panel
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    background: 'radial-gradient(ellipse at 30% 20%, rgba(245, 158, 11, 0.03) 0%, transparent 60%), #0F1117',
  },
  formWrap: {
    width: '100%',
    maxWidth: 400,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: '#F5F3FF',
    margin: 0,
    marginBottom: 8,
  },
  welcomeSub: {
    fontSize: 15,
    color: 'rgba(245, 243, 255, 0.5)',
    margin: 0,
    marginBottom: 36,
  },

  // Form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: 'rgba(245, 243, 255, 0.6)',
  },
  input: {
    padding: '14px 16px',
    fontSize: 15,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(245, 158, 11, 0.12)',
    borderRadius: 12,
    color: '#F5F3FF',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocused: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.08)',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#FCA5A5',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.5,
  },
  btn: {
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    border: 'none',
    borderRadius: 12,
    color: '#1A1225',
    cursor: 'pointer',
    marginTop: 4,
    transition: 'opacity 0.2s, transform 0.1s',
    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(245, 243, 255, 0.5)',
    fontSize: 13,
    cursor: 'pointer',
    padding: '8px 0',
    textAlign: 'center',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '4px 0',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(245, 243, 255, 0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    opacity: 0.5,
  },
  footerIcon: {
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(245, 243, 255, 0.7)',
    fontWeight: 500,
  },
};

// ── Admin styles (original) ──

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--accent-teal)',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--bg-primary)',
    backgroundColor: 'var(--accent-teal)',
    padding: '2px 8px',
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: 'var(--accent-red)',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
  },
  input: {
    padding: '12px 14px',
    fontSize: 14,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    outline: 'none',
  },
  btn: {
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 600,
    backgroundColor: 'var(--accent-teal)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    cursor: 'pointer',
    marginTop: 4,
  },
  twoFactorLabel: {
    color: 'var(--text-primary)',
    fontSize: 14,
    margin: '0 0 4px',
    textAlign: 'center',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary, #888)',
    fontSize: 13,
    cursor: 'pointer',
    padding: '8px 0',
    textAlign: 'center',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '4px 0',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--text-secondary, #888)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
};
