import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForgotPasswordPage() {
  const { forgotPassword, verifyResetOtp, resetPassword, resendOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('email'); // 'email' or 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setStep('reset');
      setCountdown(60);
      setSuccessMessage('A 6-digit verification code has been sent to your email.');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to send reset code. Please make sure the email is registered.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ email, otp, password });
      setSuccessMessage('Password reset successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Verification or password reset failed. Please check the code and try again.';
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
      await resendOtp({ email, type: 'PASSWORD_RESET' });
      setCountdown(60);
      setSuccessMessage('A new reset verification code has been sent to your email.');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to resend verification code. Please try again.';
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setError('');
    setSuccessMessage('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
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
              {step === 'email' ? 'Forgot password?' : 'Reset your password'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {step === 'email' 
                ? "Enter your email to request a reset code" 
                : `Enter the code sent to ${email} and your new password`
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
              id="forgot-password-error"
              role="alert"
              className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl px-4 py-3 text-sm mb-6"
            >
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendEmail} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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

              <button
                id="forgot-submit"
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
                    Sending code…
                  </span>
                ) : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
              {/* Reset OTP */}
              <div>
                <label
                  htmlFor="reset-otp"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Verification Code (OTP)
                </label>
                <div className="relative">
                  <input
                    id="reset-otp"
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

              {/* Password */}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-base pl-10 pr-10"
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-base pl-10"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Reset Password Button */}
              <button
                id="reset-submit"
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
                    Resetting password…
                  </span>
                ) : 'Reset Password'}
              </button>

              {/* Resend Actions */}
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
                  onClick={handleBackToEmail}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-colors mt-2"
                >
                  ← Back to email input
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Remembered your password?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
