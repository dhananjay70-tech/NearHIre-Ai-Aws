/**
 * UnauthorizedPage.jsx — Shown when a signed-in user opens a route their role
 * cannot access (403). Offers a way back to the dashboard for THEIR role.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import { homePathForRole, roleLabel } from "../utils/roles.js";

export default function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const homePath = homePathForRole(user?.role);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-lg rounded-3xl border border-slate-200/70 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl p-8 sm:p-10 text-center shadow-xl"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/25"
        >
          <ShieldAlert className="h-8 w-8 text-white" />
        </motion.div>

        <p className="text-xs font-black uppercase tracking-widest text-red-500">
          Error 403
        </p>

        <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Access denied
        </h1>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {isAuthenticated ? (
            <>
              You&apos;re signed in as a{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {roleLabel(user?.role)}
              </span>
              , and this area is restricted to a different role.
            </>
          ) : (
            <>You need to sign in with an account that has access to this area.</>
          )}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              to={homePath}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to my dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
            >
              Sign in
            </Link>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
