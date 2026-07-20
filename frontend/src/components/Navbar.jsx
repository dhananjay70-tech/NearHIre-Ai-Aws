/**
 * Navbar.jsx — NearHire.AI premium navbar with grouped navigation.
 *
 * Desktop:  Logo | Jobs · Resume · Dashboard · Applications · Saved | [AI Tools ▾] | ⌘K · 🔔 · Profile
 * Mobile:   Logo | 🔔 · ☰ → Full drawer with grouped sections
 *
 * Features:
 * - Glassmorphism backdrop-blur sticky header
 * - Animated pill indicator for active route (framer-motion layoutId)
 * - "AI Tools" mega-dropdown with icons
 * - ⌘K Command Palette
 * - Rich profile dropdown with theme picker
 * - Premium mobile drawer with categorized sections
 * - Scroll-aware shrink
 */

import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { FullLogo } from './Logo.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  Bot,
  Sparkles,
  Bookmark,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Command,
  Home,
  MapPin,
  Sun,
  Moon,
  Monitor,
  Zap,
  Target,
  Route,
  PenTool,
  Building2,
  Shield,
  Briefcase,
  User,
  Users,
  BarChart3,
  Settings,
} from 'lucide-react';

import { ROLES, normalizeRole, roleLabel } from '../utils/roles.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService.js';

/** Relative time for notification timestamps ("3 hours ago"). */
function timeAgo(value) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const units = [['d', 86400], ['h', 3600], ['m', 60]];
  for (const [label, secs] of units) {
    const n = Math.floor(seconds / secs);
    if (n >= 1) return `${n}${label} ago`;
  }
  return 'just now';
}

const NOTIF_ACCENT = {
  SUCCESS: 'bg-emerald-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-red-500',
  INFO: 'bg-indigo-500',
};

/* ─────────────────────────────────────────────
   Notifications dropdown
───────────────────────────────────────────── */
function NotificationsDropdown({ items, unreadCount, onMarkAll, onItemClick, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-zinc-800/80 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden z-40"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800/80">
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              {unreadCount} new
            </span>
          )}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAll}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="w-7 h-7 mx-auto mb-2 text-slate-300 dark:text-zinc-700" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300">You&apos;re all caught up</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
              Updates about your applications will appear here.
            </p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => onItemClick(n)}
              className={`w-full text-left flex gap-3 px-4 py-3 border-b border-slate-50 dark:border-zinc-800/50 last:border-0 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/50 ${
                n.isRead ? '' : 'bg-indigo-50/40 dark:bg-indigo-950/20'
              }`}
            >
              <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${NOTIF_ACCENT[n.type] || NOTIF_ACCENT.INFO}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">{n.title}</span>
                {n.body && (
                  <span className="block text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">{n.body}</span>
                )}
                <span className="block text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{timeAgo(n.createdAt)}</span>
              </span>
            </button>
          ))
        )}
      </div>

      <Link
        to="/applications"
        onClick={onClose}
        className="block px-4 py-2.5 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border-t border-slate-100 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
      >
        View all applications
      </Link>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Link groups
───────────────────────────────────────────── */

// ── Primary links per role. The navbar swaps automatically on login. ──

const SEEKER_LINKS = [
  { to: '/search',       label: 'Jobs',         icon: Search },
  { to: '/resume',       label: 'Resume',       icon: FileText },
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/applications', label: 'Applications', icon: ClipboardList },
  { to: '/saved-jobs',   label: 'Saved',        icon: Bookmark },
];

const RECRUITER_LINKS = [
  { to: '/recruiter/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/recruiter/post-job',   label: 'Post Job',    icon: PenTool },
  { to: '/recruiter/jobs',       label: 'Manage Jobs', icon: ClipboardList },
  { to: '/recruiter/applicants', label: 'Applicants',  icon: Users },
  { to: '/recruiter/company',    label: 'Company',     icon: Building2 },
  { to: '/recruiter/analytics',  label: 'Analytics',   icon: BarChart3 },
];

const ADMIN_LINKS = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/admin/users',      label: 'Users',      icon: Users },
  { to: '/admin/recruiters', label: 'Recruiters', icon: Building2 },
  { to: '/admin/jobs',       label: 'Jobs',       icon: Briefcase },
  { to: '/admin/reports',    label: 'Reports',    icon: BarChart3 },
  { to: '/admin/settings',   label: 'Settings',   icon: Settings },
];

/** Primary navbar links for a normalized role. */
function linksForRole(role) {
  if (role === ROLES.RECRUITER) return RECRUITER_LINKS;
  if (role === ROLES.ADMIN) return ADMIN_LINKS;
  return SEEKER_LINKS;
}

// AI Tools dropdown — AI features ONLY (no recruiter/admin entries).
// Shown to job seekers, since these tools operate on a candidate's resume.
const AI_TOOLS = [
  { to: '/resume-rewriter',  label: 'AI Resume Rewriter', icon: PenTool,  desc: 'Rewrite your resume with AI' },
  { to: '/skill-gap',        label: 'Skill Gap Analysis', icon: Target,   desc: 'Find missing skills for any job' },
  { to: '/roadmap',          label: 'Learning Roadmap',   icon: Route,    desc: 'Personalized week-by-week plan' },
  { to: '/recommendations',  label: 'Job Matches',        icon: Sparkles, desc: 'AI-ranked jobs for your profile' },
];

const PUBLIC_LINKS = [
  { to: '/',       label: 'Home', icon: Home },
  { to: '/search', label: 'Jobs', icon: MapPin },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ─────────────────────────────────────────────
   Avatar
───────────────────────────────────────────── */
function Avatar({ initials, size = 'md' }) {
  const s = size === 'lg' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${s} rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-violet-500/20 flex-shrink-0`}>
      <span className="text-white font-black tracking-tight">{initials}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Theme cycler (inside profile dropdown)
───────────────────────────────────────────── */
function ThemeCycler({ onClose }) {
  const { theme, setTheme } = useTheme();
  const options = [
    { key: 'light',  icon: Sun,     label: 'Light' },
    { key: 'dark',   icon: Moon,    label: 'Dark' },
    { key: 'system', icon: Monitor, label: 'System' },
  ];
  return (
    <div className="px-2 py-1.5">
      <p className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1.5">
        Appearance
      </p>
      <div className="flex gap-1">
        {options.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setTheme(key); onClose(); }}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[11px] font-semibold transition-all duration-200 ${
              theme === key
                ? 'bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30'
                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI Tools mega-dropdown
───────────────────────────────────────────── */
function AIToolsDropdown({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-zinc-800/80 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden z-40"
    >
      <div className="p-2">
        <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          ✨ AI-Powered Tools
        </p>
        {AI_TOOLS.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-violet-500/20 group-hover:to-indigo-500/20 transition">
              <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">{label}</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* AI Tools contains AI features only — recruiter/admin areas are
          reached through their own role-based navbars. */}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Profile dropdown
───────────────────────────────────────────── */
function ProfileDropdown({ user, initials, onClose, onLogout }) {
  // Quick links follow the user's role so a recruiter never sees seeker pages.
  const quickLinks = linksForRole(normalizeRole(user?.role)).slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-3 w-72 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/60 dark:border-zinc-800/80 shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden z-40"
    >
      {/* User header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <Avatar initials={initials} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{user?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
              {roleLabel(user?.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="px-2 py-2">
        {quickLinks.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <Icon className="w-4 h-4 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      {/* Theme picker */}
      <div className="border-t border-slate-100 dark:border-zinc-800/80">
        <ThemeCycler onClose={onClose} />
      </div>

      {/* Sign out */}
      <div className="px-2 pb-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Command Palette (⌘K)
───────────────────────────────────────────── */
function CommandPalette({ links, onNavigate, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filtered = links.filter((l) =>
    query === '' || l.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -16 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed top-28 left-1/2 -translate-x-1/2 z-[61] w-full max-w-xl rounded-2xl bg-white/98 dark:bg-zinc-900/98 backdrop-blur-2xl border border-slate-200/70 dark:border-zinc-700/60 shadow-2xl shadow-black/20 overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-zinc-800">
          <Search className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none"
          />
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-mono text-slate-400 dark:text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="p-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 dark:text-zinc-500 py-8">
              No results for "{query}"
            </p>
          ) : (
            <>
              <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                Navigate
              </p>
              {filtered.map((l) => {
                const Icon = l.icon;
                return (
                  <button
                    key={l.to}
                    onClick={() => { onNavigate(l.to); onClose(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                    {l.label}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Mobile drawer section
───────────────────────────────────────────── */
function MobileSection({ title, links, onClose }) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
        {title}
      </p>
      {links.map((l) => {
        const Icon = l.icon;
        return (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-700 dark:text-violet-400'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" strokeWidth={1.8} />
            {l.label}
          </NavLink>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN NAVBAR
═══════════════════════════════════════════════ */
export default function Navbar() {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiDropOpen,  setAiDropOpen]  = useState(false);
  const [cmdOpen,     setCmdOpen]     = useState(false);

  // Real notifications — no hardcoded indicator.
  const [notifOpen, setNotifOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const notifRef = useRef(null);

  const initials = getInitials(user?.name);
  const aiDropRef = useRef(null);

  // Role drives which primary links render. AI Tools are seeker-facing only.
  const role = normalizeRole(user?.role);
  const primaryLinks = linksForRole(role);
  const showAiTools = role === ROLES.SEEKER;
  const commandLinks = showAiTools ? [...primaryLinks, ...AI_TOOLS] : primaryLinks;

  /* scroll listener */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Load notifications once signed in, then poll every 60s.
     Cleared on sign-out so a stale badge never lingers. */
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await getNotifications({ limit: 20 });
        if (cancelled) return;
        setNotifications(data?.notifications || []);
        setUnreadCount(data?.unreadCount || 0);
      } catch {
        // Never let a notification failure break the navbar.
      }
    };

    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated]);

  /* Close the notifications dropdown on an outside click */
  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [notifOpen]);

  async function handleMarkAllRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      /* optimistic — the next poll reconciles */
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      try {
        await markNotificationRead(notification.id);
      } catch {
        /* optimistic */
      }
    }

    const jobId = notification.metadata?.jobId;
    setNotifOpen(false);
    if (jobId) navigate(`/jobs/${jobId}`);
    else navigate('/applications');
  }

  /* ⌘K shortcut */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* close panels on route change */
  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
    setAiDropOpen(false);
  }, [location.pathname]);

  /* close AI dropdown on outside click */
  useEffect(() => {
    if (!aiDropOpen) return;
    const handler = (e) => {
      if (aiDropRef.current && !aiDropRef.current.contains(e.target)) setAiDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [aiDropOpen]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
    navigate('/', { replace: true });
  };

  // Check if any AI tool route is active (for highlight)
  const isAiToolActive = AI_TOOLS.some((t) => location.pathname.startsWith(t.to));

  return (
    <>
      {/* ── Top bar ─────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'h-14 bg-white/80 dark:bg-zinc-950/85 backdrop-blur-2xl border-b border-slate-200/60 dark:border-zinc-800/60 shadow-sm shadow-black/5'
            : 'h-16 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-xl border-b border-transparent'
        }`}
      >
        <div className="max-w-[1320px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">

          {/* ── Brand ── */}
          <Link to="/" className="flex-shrink-0 mr-2" aria-label="NearHire.AI home">
            <FullLogo showText />
          </Link>

          {/* ── Desktop nav ── */}
          {!loading && isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-0.5 flex-1" aria-label="Main navigation">
              {/* Primary links — swap automatically with the logged-in role */}
              {primaryLinks.map((l) => {
                const Icon = l.icon;
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) =>
                      `relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors duration-200 ${
                        isActive
                          ? 'text-violet-700 dark:text-violet-400'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-pill"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/8 ring-1 ring-inset ring-violet-500/20 dark:ring-violet-400/15"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <Icon className="relative w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                        <span className="relative">{l.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}

              {/* ── AI Tools dropdown (job seekers only) ── */}
              {showAiTools && (
              <div className="relative" ref={aiDropRef}>
                <button
                  onClick={() => setAiDropOpen((o) => !o)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors duration-200 ${
                    isAiToolActive
                      ? 'text-violet-700 dark:text-violet-400'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {isAiToolActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/8 ring-1 ring-inset ring-violet-500/20 dark:ring-violet-400/15"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Sparkles className="relative w-4 h-4 flex-shrink-0" strokeWidth={isAiToolActive ? 2.2 : 1.8} />
                  <span className="relative">AI Tools</span>
                  <ChevronDown className={`relative w-3 h-3 transition-transform duration-200 ${aiDropOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {aiDropOpen && (
                    <AIToolsDropdown onClose={() => setAiDropOpen(false)} />
                  )}
                </AnimatePresence>
              </div>
              )}
            </nav>
          )}

          {/* Spacer for public / loading */}
          {!loading && !isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-0.5 flex-1" aria-label="Main navigation">
              {PUBLIC_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === '/'}
                    className={({ isActive }) =>
                      `relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors duration-200 ${
                        isActive
                          ? 'text-violet-700 dark:text-violet-400'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-800/50'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-pill"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/8 ring-1 ring-inset ring-violet-500/20 dark:ring-violet-400/15"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <Icon className="relative w-4 h-4 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                        <span className="relative">{l.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          )}

          {loading && <div className="flex-1" />}

          {/* ── Desktop right side actions ── */}
          <div className="hidden lg:flex items-center gap-1 ml-auto">

            {/* ⌘K button */}
            <button
              onClick={() => setCmdOpen(true)}
              aria-label="Open command palette (Ctrl+K)"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
            >
              <Command className="w-4 h-4" />
              <span className="hidden xl:inline text-[12px]">Search</span>
              <kbd className="hidden xl:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                ⌘K
              </kbd>
            </button>

            {/* Notification bell — driven by real unread counts */}
            {isAuthenticated && (
              <div className="relative" ref={notifRef}>
                <button
                  aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
                  onClick={() => setNotifOpen((o) => !o)}
                  className="relative p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
                >
                  <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white dark:ring-zinc-950">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <NotificationsDropdown
                      items={notifications}
                      unreadCount={unreadCount}
                      onMarkAll={handleMarkAllRead}
                      onItemClick={handleNotificationClick}
                      onClose={() => setNotifOpen(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Auth state */}
            {loading ? (
              <div className="w-[100px] h-8 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse ml-1" />
            ) : isAuthenticated ? (
              /* Profile button */
              <div className="relative ml-1">
                <button
                  id="profile-menu-btn"
                  onClick={() => setProfileOpen((p) => !p)}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2 px-2 py-1 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    profileOpen
                      ? 'border-violet-400/50 bg-violet-50 dark:bg-violet-950/20 shadow-sm'
                      : 'border-slate-200/70 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Avatar initials={initials} />
                  <span className="text-[13px] font-bold text-slate-700 dark:text-zinc-200 max-w-[100px] truncate hidden xl:block">
                    {user?.name}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setProfileOpen(false)}
                        aria-hidden="true"
                      />
                      <div id="profile-menu" role="menu">
                        <ProfileDropdown
                          user={user}
                          initials={initials}
                          onClose={() => setProfileOpen(false)}
                          onLogout={handleLogout}
                        />
                      </div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Guest CTA */
              <div className="flex items-center gap-2 ml-1">
                <Link
                  to="/login"
                  className="text-[13px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400 px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 text-[13px] font-bold bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white px-4 py-2 rounded-xl shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile right side ── */}
          <div className="flex lg:hidden items-center gap-1 ml-auto">
            {isAuthenticated && (
              <button
                onClick={() => setNotifOpen((p) => !p)}
                aria-label="Notifications"
                className="relative p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950 animate-pulse" />
                )}
              </button>
            )}

            {!loading && !isAuthenticated && (
              <Link
                to="/login"
                className="text-[13px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-violet-600 px-3 py-2 transition-colors"
              >
                Log in
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((p) => !p)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={mobileOpen ? 'x' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0,   opacity: 1 }}
                  exit={{    rotate: 90,  opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>

        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="lg:hidden fixed top-14 sm:top-16 inset-x-0 z-40 mx-3 mt-2 rounded-2xl bg-white/97 dark:bg-zinc-900/97 backdrop-blur-2xl border border-slate-200/60 dark:border-zinc-800/70 shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden max-h-[80vh] overflow-y-auto"
          >
            {isAuthenticated ? (
              <div className="pb-2">
                <MobileSection title={roleLabel(role)} links={primaryLinks} onClose={() => setMobileOpen(false)} />

                {showAiTools && (
                  <div className="border-t border-slate-100 dark:border-zinc-800 mt-1">
                    <MobileSection title="AI Tools" links={AI_TOOLS} onClose={() => setMobileOpen(false)} />
                  </div>
                )}

                {/* User footer */}
                <div className="mx-3 mb-2 mt-1 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">{user?.name}</span>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 truncate">{user?.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileOpen(false); handleLogout(); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="pb-2">
                <MobileSection title="Navigate" links={PUBLIC_LINKS} onClose={() => setMobileOpen(false)} />

                <div className="mx-3 mb-3 mt-1 pt-3 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition-all hover:shadow-lg active:scale-95"
                  >
                    Get started
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Command Palette ───────────────────────────── */}
      <AnimatePresence>
        {cmdOpen && (
          <CommandPalette
            links={isAuthenticated ? commandLinks : PUBLIC_LINKS}
            onNavigate={(to) => navigate(to)}
            onClose={() => setCmdOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
