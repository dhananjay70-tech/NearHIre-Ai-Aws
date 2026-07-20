/**
 * AuthContext.jsx — Global authentication state for the NearHire.AI frontend.
 *
 * On app startup, calls GET /auth/me to restore session from the httpOnly cookie.
 * Exposes user state and all auth actions to child components.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService.js';
import { ROLES, normalizeRole } from '../utils/roles.js';

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session on startup

  // ── Restore session on mount ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await authService.getMe();
        if (data) {
          setUser(data.user);
          setPreferences(data.preferences);
        }
      } catch {
        // Unexpected error — treat as logged out
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Refresh user ──────────────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const data = await authService.getMe();
    if (data) {
      setUser(data.user);
      setPreferences(data.preferences);
    } else {
      setUser(null);
      setPreferences(null);
    }
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    const data = await authService.register(formData);
    setUser(data.user);
    return data;
  }, []);

  // ── Login (Step 1) ────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    return data;
  }, []);

  // ── Verify OTP (Step 2) ────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (payload) => {
    const data = await authService.verifyOtp(payload);
    setUser(data.user);
    return data;
  }, []);

  // ── Resend OTP ────────────────────────────────────────────────────────────────
  const resendOtp = useCallback(async (payload) => {
    const data = await authService.resendOtp(payload);
    return data;
  }, []);

  // ── Forgot Password ──────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    const data = await authService.forgotPassword(email);
    return data;
  }, []);

  const verifyResetOtp = useCallback(async (payload) => {
    const data = await authService.verifyResetOtp(payload);
    return data;
  }, []);

  const resetPassword = useCallback(async (payload) => {
    const data = await authService.resetPassword(payload);
    return data;
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setPreferences(null);
  }, []);

  // ── Update profile ────────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (fields) => {
    const data = await authService.updateProfile(fields);
    setUser(data.user);
    return data;
  }, []);

  // ── Update preferences ────────────────────────────────────────────────────────
  const updatePreferences = useCallback(async (fields) => {
    const data = await authService.updatePreferences(fields);
    setPreferences(data.preferences);
    return data;
  }, []);

  // Normalized role drives navigation/rendering only — the API re-checks it.
  const role = user ? normalizeRole(user.role) : null;

  const value = {
    user,
    preferences,
    loading,
    isAuthenticated: !!user,
    role,
    isSeeker: role === ROLES.SEEKER,
    isRecruiter: role === ROLES.RECRUITER,
    isAdmin: role === ROLES.ADMIN,
    register,
    login,
    verifyOtp,
    resendOtp,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    logout,
    refreshUser,
    updateProfile,
    updatePreferences,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * useAuth — Access authentication context from any component.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
