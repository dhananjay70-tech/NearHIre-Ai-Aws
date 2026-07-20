import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export default function AccountCreatedPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 text-white overflow-hidden px-4 py-12 selection:bg-emerald-500 selection:text-white">

      {/* ── Background Aurora Gradients & Glow Orbs ────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-600/20 via-indigo-600/15 to-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* ── Main Glassmorphism Card Container ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg z-10"
      >
        <div className="relative bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-black/80 ring-1 ring-white/10 overflow-hidden text-center">

          {/* Top subtle highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-violet-500" />

          {/* ── Animated Checkmark Icon Bubble ───────────────────────── */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 relative group"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Check className="w-10 h-10 text-zinc-950 stroke-[3]" />
            </motion.div>
            {/* Ambient ring glow */}
            <div className="absolute inset-0 rounded-3xl bg-emerald-400/40 blur-md -z-10 animate-ping opacity-40" style={{ animationDuration: '3s' }} />
          </motion.div>

          {/* ── Title & Subtitle ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Account Verified
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
              Account Created Successfully!
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              Welcome to <strong className="text-zinc-200">NearHire.AI</strong>! Your account has been activated. Log in now to access personalized job recommendations, resume matching, and AI career guidance.
            </p>
          </motion.div>

          {/* ── Feature Highlights ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="grid grid-cols-3 gap-2 mb-8 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 text-left"
          >
            <div className="flex flex-col items-center text-center p-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-1.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-zinc-300">AI Matching</p>
              <p className="text-[9px] text-zinc-500">Smart scoring</p>
            </div>
            <div className="flex flex-col items-center text-center p-2 border-x border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-zinc-300">Secure Access</p>
              <p className="text-[9px] text-zinc-500">JWT protected</p>
            </div>
            <div className="flex flex-col items-center text-center p-2">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-1.5">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold text-zinc-300">Instant Jobs</p>
              <p className="text-[9px] text-zinc-500">City & radius</p>
            </div>
          </motion.div>

          {/* ── Primary Action Button ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="space-y-3"
          >
            <Link
              to="/login"
              className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-indigo-600 to-violet-600 hover:from-emerald-400 hover:to-violet-500 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-500/20 hover:shadow-indigo-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue to Login
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link
              to="/"
              className="block text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition duration-150"
            >
              Back to Home Page
            </Link>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
