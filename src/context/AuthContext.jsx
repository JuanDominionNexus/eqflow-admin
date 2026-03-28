import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin } from '../api/admin';
import { setOnUnauthorized } from '../api/client';
import client from '../api/client';
import { getPortalMode } from '../hooks/usePortalMode';
import { startAuthentication } from '@simplewebauthn/browser';

const AuthContext = createContext(null);

const portalMode = getPortalMode();

function hasAccess(r) {
  if (portalMode === 'admin') return r.isAdmin;
  return true; // therapist portal: anyone can log in (UI gates what they see)
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState({ isAdmin: false, isTherapist: false, therapistProfileStatus: 'none' });

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('therapist_name');
    setToken(null);
    setRole({ isAdmin: false, isTherapist: false, therapistProfileStatus: 'none' });
  }, []);

  // Set up 401 interceptor
  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  const fetchRole = useCallback(async () => {
    const res = await client.get('/auth/me');
    const { is_admin, is_therapist, therapist_profile_status, name } = res.data;
    if (name) localStorage.setItem('therapist_name', name);
    const r = {
      isAdmin: !!is_admin,
      isTherapist: !!is_therapist,
      therapistProfileStatus: therapist_profile_status || 'none',
    };
    setRole(r);
    return r;
  }, []);

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchRole()
      .then((r) => {
        if (!hasAccess(r)) logout();
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 403 || err.response?.status === 401) {
          logout();
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [twoFactorPending, setTwoFactorPending] = useState(null); // { twoFactorToken, mfaMethod }

  const completeLogin = async (authToken) => {
    localStorage.setItem('admin_token', authToken);
    setToken(authToken);
    try {
      const r = await fetchRole();
      if (!hasAccess(r)) {
        localStorage.removeItem('admin_token');
        setToken(null);
        const msg = portalMode === 'admin'
          ? 'This account does not have admin access'
          : 'Failed to verify access';
        setError(msg);
        return false;
      }
    } catch (err) {
      localStorage.removeItem('admin_token');
      setToken(null);
      setError('Failed to verify access');
      return false;
    }
    setLoading(false);
    return true;
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await apiLogin(email, password);
      if (data.requiresTwoFactor) {
        setTwoFactorPending({
          twoFactorToken: data.twoFactorToken,
          mfaMethod: data.mfaMethod || 'totp',
        });
        return 'requires_2fa';
      }
      return await completeLogin(data.token);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
      return false;
    }
  };

  const verifyTwoFactor = async (code) => {
    setError(null);
    if (!twoFactorPending) {
      setError('No 2FA challenge pending');
      return false;
    }
    try {
      const res = await client.post('/two-factor/verify-login', {
        twoFactorToken: twoFactorPending.twoFactorToken,
        code,
      });
      setTwoFactorPending(null);
      return await completeLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
      return false;
    }
  };

  const verifyTwoFactorPasskey = async () => {
    setError(null);
    if (!twoFactorPending) {
      setError('No 2FA challenge pending');
      return false;
    }
    try {
      // Get WebAuthn challenge options from backend
      const { data } = await client.post('/two-factor/passkey-challenge', {
        mfaToken: twoFactorPending.twoFactorToken,
      });
      const { challengeId, ...optionsJSON } = data;
      // Trigger browser passkey prompt
      const authResponse = await startAuthentication({ optionsJSON });
      // Verify with backend
      const res = await client.post('/two-factor/verify-login-passkey', {
        twoFactorToken: twoFactorPending.twoFactorToken,
        challengeId,
        response: authResponse,
      });
      setTwoFactorPending(null);
      return await completeLogin(res.data.token);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled');
      } else {
        setError(err.response?.data?.error || err.message || 'Passkey verification failed');
      }
      return false;
    }
  };

  // Passwordless passkey login — bypasses email/password entirely
  const loginWithPasskey = async () => {
    setError(null);
    try {
      // Get WebAuthn options (no user ID needed — discoverable credentials)
      const { data: authOpts } = await client.post('/passkeys/authenticate/options');
      const { challengeId, ...optionsJSON } = authOpts;
      // Trigger browser passkey prompt
      const authResponse = await startAuthentication({ optionsJSON });
      // Verify with backend — returns JWT directly (passkeys are inherently multi-factor)
      const { data } = await client.post('/passkeys/authenticate/verify', {
        challengeId,
        response: authResponse,
      });
      return await completeLogin(data.token);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Passkey authentication was cancelled');
      } else {
        setError(err.response?.data?.error || err.message || 'Passkey login failed');
      }
      return false;
    }
  };

  const cancelTwoFactor = () => {
    setTwoFactorPending(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, loading, error, role, portalMode, twoFactorPending, verifyTwoFactor, verifyTwoFactorPasskey, loginWithPasskey, cancelTwoFactor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
