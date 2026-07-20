/**
 * ProtectedRoute.jsx — Redirect unauthenticated users to /login.
 *
 * - While auth is loading: shows a full-screen loading spinner.
 * - Not authenticated: redirects to /login with `state.from` set.
 * - Authenticated: renders children normally.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading screen while session is being verified on startup.
  // This prevents the protected page from briefly flashing before redirecting.
  if (loading) {
    return (
      <div
        id="auth-loading-screen"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: '#f8fafc',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '4px solid #e0e7ff',
            borderTop: '4px solid #6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Checking your session…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the originally requested path so LoginPage can redirect back
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
