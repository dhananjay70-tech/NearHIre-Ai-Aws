/**
 * RoleRoute.jsx — Route guard that also enforces a role.
 *
 * - While the session is loading: reuse ProtectedRoute's loading screen.
 * - Not authenticated:   -> /login (preserving the target path)
 * - Wrong role:          -> /unauthorized
 * - Correct role:        renders children
 *
 * This is a UX guard only. The backend independently rejects the request with
 * 403, so a user editing client state gains nothing.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import { normalizeRole } from '../utils/roles.js';

export default function RoleRoute({ allow = [], children }) {
  const { user, loading } = useAuth();

  // Delegate the "is logged in at all?" question (and its loading screen).
  return (
    <ProtectedRoute>
      <RoleGate allow={allow} role={user?.role} loading={loading}>
        {children}
      </RoleGate>
    </ProtectedRoute>
  );
}

function RoleGate({ allow, role, loading, children }) {
  if (loading) return null;

  const actual = normalizeRole(role);
  const allowed = allow.map(normalizeRole);

  if (allowed.length > 0 && !allowed.includes(actual)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
