import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Building2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, homePathForRole, normalizeRole } from '../utils/roles.js';

/**
 * Account types offered before the credentials form. The choice is a UX hint
 * only — the account's real role comes from the backend on login, and the app
 * always redirects using that verified role.
 *
 * Only Job Seeker and Recruiter are surfaced. Admin is intentionally NOT a
 * public account type: admins sign in with the same form and are routed to
 * /admin/dashboard automatically by their verified role.
 */
const ACCOUNT_TYPES = [
  {
    role: ROLES.SEEKER,
    label: 'Job Seeker',
    desc: 'Find jobs, track applications, improve your resume',
    icon: User,
    accent: 'from-indigo-500 to-violet-600',
  },
  {
    role: ROLES.RECRUITER,
    label: 'Recruiter',
    desc: 'Post jobs and manage applicants',
    icon: Building2,
    accent: 'from-emerald-500 to-teal-600',
  },
];

const SELECTED_ROLE_KEY = 'nearhire_selected_role';

export default function LoginPage() {
  const { login, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('credentials'); // 'credentials' or 'otp'
  const [selectedRole, setSelectedRole] = useState(
    () => sessionStorage.getItem(SELECTED_ROLE_KEY) || ROLES.SEEKER
  );
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Remember the pick across the OTP step / a page refresh.
  const chooseRole = (role) => {
    setSelectedRole(role);
    sessionStorage.setItem(SELECTED_ROLE_KEY, role);
  };

  /**
   * Send the user to the right place after a verified login.
   * The role always comes from the server response — never from the radio
   * button — so a user cannot reach another role's area by picking a card.
   */
  const redirectAfterLogin = (verifiedUser) => {
    const actualRole = normalizeRole(verifiedUser?.role);
    const requested = location.state?.from?.pathname;
    const home = homePathForRole(actualRole);

    // Only honour the originally-requested path when it belongs to this role.
    const isForeign =
      (requested?.startsWith('/recruiter') && actualRole !== ROLES.RECRUITER) ||
      (requested?.startsWith('/admin') && actualRole !== ROLES.ADMIN);

    navigate(requested && !isForeign ? requested : home, { replace: true });
  };

  const handleSubmitCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await login({ email: form.email, password: form.password });
      if (result?.otpRequired) {
        setStep('otp');
        setCountdown(60);
        setSuccessMessage('A 6-digit verification code has been sent to your email.');
      } else {
        // Fallback in case two-step is bypassed or not flagged
        redirectAfterLogin(result?.user);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Login failed. Please check your connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await verifyOtp({ email: form.email, otp });
      redirectAfterLogin(result?.user);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Verification failed. Please check the code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || resendLoading) return;
    setError('');
    setSuccessMessage('');
    setResendLoading(true);

    try {
      await resendOtp({ email: form.email });
      setCountdown(60);
      setSuccessMessage('A new verification code has been sent to your email.');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to resend verification code. Please try again.';
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setError('');
    setSuccessMessage('');
    setOtp('');
  };

  return (
    <div className="min-h-screen hero-gradient dark:bg-zinc-950 flex items-center justify-center px-4 py-12">
      {/* Decorative orbs */}
      <div className="fixed top-20 right-10 w-64 h-64 bg-violet-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-10 w-80 h-80 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md fade-in-up">
        {/* Card */}
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl shadow-slate-200 dark:shadow-black/30 border border-slate-100 dark:border-zinc-800 p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-sm font-black">N</span>
              </div>
              <span className="text-base font-bold text-slate-800 dark:text-white">NearHire<span className="text-indigo-500 dark:text-indigo-400">.AI</span></span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1">
              {step === 'credentials' ? 'Welcome back' : 'Verify your email'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {step === 'credentials'
                ? 'Log in to your NearHire.AI account'
                : `Enter the 6-digit code sent to ${form.email}`
              }
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-2xl px-4 py-3 text-sm mb-6 animate-pulse"
            >
              <span className="text-base">✉️</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              id="login-error"
              role="alert"
              className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm mb-6"
            >
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleSubmitCredentials} className="space-y-5" noValidate>
              {/* ── Account type selection ── */}
              <fieldset>
                <legend className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Choose your account type
                </legend>

                <div className="grid gap-2.5 grid-cols-2">
                  {ACCOUNT_TYPES.map(({ role, label, desc, icon: Icon, accent }) => {
                    const isSelected = selectedRole === role;

                    return (
                      <motion.button


                      
                        key={role}
                        type="button"
                        onClick={() => chooseRole(role)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        aria-pressed={isSelected}
                        title={desc}
                        className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center transition-colors duration-200 ${
                          isSelected
                            ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600">
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          </span>
                        )}

                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-sm`}
                        >
                          <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                        </span>

                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                <p className="mt-2.5 text-[11px] text-slate-400 dark:text-zinc-500">
                  You&apos;ll be taken to the area your account actually has access to.
                </p>
              </fieldset>

              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="input-base"
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
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-base pr-12"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
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
                    Validating credentials…
                  </span>
                ) : 'Log in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
              {/* OTP Input */}
              <div>
                <label
                  htmlFor="login-otp"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Verification Code (OTP)
                </label>
                <div className="relative">
                  <input
                    id="login-otp"
                    type="text"
                    name="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="input-base pl-10 text-center tracking-[0.25em] text-lg font-bold"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                id="otp-verify-submit"
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
                    Verifying OTP…
                  </span>
                ) : 'Verify & Log in'}
              </button>

              {/* Resend OTP Actions */}
              <div className="flex flex-col items-center gap-2 pt-2">
                {countdown > 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Resend code in <span className="font-bold text-indigo-600 dark:text-indigo-400">{countdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading}
                    className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                  >
                    {resendLoading ? 'Resending code…' : 'Resend verification code'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-colors mt-2"
                >
                  ← Back to login
                </button>
              </div>
            </form>
          )}

          {step === 'credentials' && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Create one free
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
