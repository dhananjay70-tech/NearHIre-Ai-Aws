import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, homePathForRole } from '../utils/roles.js';

const PASSWORD_RULES =
  'At least 8 characters, including uppercase, lowercase, a number and a special character.';

function getClientErrors(form) {
  const errors = [];
  if (form.name.trim().length < 2)
    errors.push('Full name must be at least 2 characters.');
  if (!form.email.includes('@'))
    errors.push('Please enter a valid email address.');
  if (form.password.length < 8)
    errors.push('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(form.password))
    errors.push('Password must contain at least one uppercase letter.');
  if (!/[a-z]/.test(form.password))
    errors.push('Password must contain at least one lowercase letter.');
  if (!/[0-9]/.test(form.password))
    errors.push('Password must contain at least one number.');
  if (!/[^A-Za-z0-9]/.test(form.password))
    errors.push('Password must contain at least one special character.');
  if (form.password !== form.confirmPassword)
    errors.push('Passwords do not match.');
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  // Public signup supports job seekers and recruiters only.
  const [role, setRole] = useState(ROLES.SEEKER);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    // Client-side validation
    const clientErrors = getClientErrors(form);
    if (clientErrors.length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        name: form.name.trim(),
        email: form.email,
        password: form.password,
        role,
      });
      navigate('/account-created', { replace: true });
    } catch (err) {
      console.error('[RegisterPage] Registration error:', err);
      const resData = err?.response?.data;
      let parsedErrors = [];

      if (Array.isArray(resData?.errors) && resData.errors.length > 0) {
        parsedErrors = resData.errors.map((e) => {
          if (typeof e === 'string') return e;
          if (typeof e?.message === 'string') return e.message;
          return 'Validation error';
        });
      } else {
        const fallbackMsg =
          (typeof resData?.message === 'string' && resData.message.trim())
            ? resData.message
            : (typeof err?.message === 'string' && err.message.trim())
            ? err.message
            : 'Registration failed. Please try again.';
        parsedErrors = [fallbackMsg];
      }

      setErrors(parsedErrors);
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }) => open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div className="min-h-screen hero-gradient dark:bg-zinc-950 flex items-center justify-center px-4 py-12">
      {/* Decorative orbs */}
      <div className="fixed top-20 right-10 w-64 h-64 bg-violet-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md fade-in-up">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl shadow-slate-200 dark:shadow-black/30 border border-slate-100 dark:border-zinc-800 p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-sm font-black">N</span>
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-white">NearHire<span className="text-indigo-500 dark:text-indigo-400">.AI</span></span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">Create your account</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Join NearHire.AI and find your next job</p>
          </div>

          {/* Error list */}
          {errors.length > 0 && (
            <div
              id="register-errors"
              role="alert"
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-6 space-y-1"
            >
              {errors.map((msg, i) => (
                <p key={i} className="flex items-start gap-2">
                  <span>•</span> {typeof msg === 'string' ? msg : (msg?.message || String(msg))}
                </p>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* ── Account type ── */}
            <fieldset>
              <legend className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                I am a
              </legend>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: ROLES.SEEKER, label: 'Job Seeker', emoji: '🔍' },
                  { value: ROLES.RECRUITER, label: 'Recruiter', emoji: '🏢' },
                ].map((option) => {
                  const isSelected = role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors duration-200 ${
                        isSelected
                          ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <span aria-hidden="true">{option.emoji}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Full Name */}
            <div>
              <label htmlFor="register-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  placeholder="Jane Doe"
                  className="input-base pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="input-base pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="input-base pl-10 pr-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" tabIndex={-1}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{PASSWORD_RULES}</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="input-base pl-10 pr-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" tabIndex={-1}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base rounded-2xl mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating account…
                </span>
              ) : '🚀 Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
