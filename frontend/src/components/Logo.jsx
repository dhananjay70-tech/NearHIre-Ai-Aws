import { motion } from 'framer-motion';

/**
 * NearHireIcon – minimal SVG mark
 * A location pin whose inner "dot" is replaced by a three-node neural net,
 * symbolising AI-powered hyperlocal job discovery.
 */
export function NearHireIcon({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nh-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7C3AED" />
          <stop offset="50%"  stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="nh-grad-inner" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {/* Pin body */}
      <path
        d="M18 2C12.477 2 8 6.477 8 12c0 7.5 10 22 10 22s10-14.5 10-22c0-5.523-4.477-10-10-10Z"
        fill="url(#nh-grad)"
      />
      {/* Highlight sheen */}
      <path
        d="M18 2C12.477 2 8 6.477 8 12c0 2.03.61 3.92 1.66 5.49C11.2 13.1 14.34 10.5 18 10.5s6.8 2.6 8.34 6.99A9.96 9.96 0 0 0 28 12c0-5.523-4.477-10-10-10Z"
        fill="white"
        opacity=".12"
      />

      {/* Neural nodes inside pin */}
      {/* Centre node */}
      <circle cx="18" cy="12.5" r="1.9" fill="white" />
      {/* Top-left node */}
      <circle cx="13.8" cy="10.2" r="1.3" fill="white" opacity=".85" />
      {/* Top-right node */}
      <circle cx="22.2" cy="10.2" r="1.3" fill="white" opacity=".85" />

      {/* Edges */}
      <line x1="13.8" y1="10.2" x2="18"   y2="12.5" stroke="white" strokeWidth="1"  opacity=".6" />
      <line x1="22.2" y1="10.2" x2="18"   y2="12.5" stroke="white" strokeWidth="1"  opacity=".6" />
      <line x1="13.8" y1="10.2" x2="22.2" y2="10.2" stroke="white" strokeWidth=".8" opacity=".35" />
    </svg>
  );
}

/**
 * FullLogo – icon + wordmark
 * Used in Navbar and footer.
 */
export function FullLogo({ size = 36, className = '', showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icon wrapper with soft glow */}
      <motion.div
        className="relative flex-shrink-0"
        whileHover={{ scale: 1.07 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      >
        <div
          className="absolute inset-0 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 blur-md opacity-35 group-hover:opacity-55 transition-opacity duration-300"
          aria-hidden="true"
        />
        <div className="relative">
          <NearHireIcon size={size} />
        </div>
      </motion.div>

      {/* Wordmark */}
      {showText && (
        <span className="text-[1.15rem] font-extrabold tracking-tight leading-none">
          <span className="text-slate-900 dark:text-white">Near</span>
          <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            Hire
          </span>
          <span className="text-slate-400 dark:text-zinc-500 font-bold">.AI</span>
        </span>
      )}
    </div>
  );
}

/**
 * LogoSpinner – rotating icon, used in loading states.
 */
export function LogoSpinner({ size = 40, className = '' }) {
  return (
    <motion.div
      className={className}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
    >
      <NearHireIcon size={size} />
    </motion.div>
  );
}

export default FullLogo;
