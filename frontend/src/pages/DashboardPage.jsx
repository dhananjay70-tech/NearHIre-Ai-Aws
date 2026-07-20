import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboard } from '../services/userDataService';

const QUICK_LINKS = [
  { label: 'Search Jobs',        to: '/search',          icon: '🔍', gradient: 'from-indigo-500 to-indigo-700' },
  { label: 'Upload Resume',      to: '/resume',          icon: '📄', gradient: 'from-violet-500 to-violet-700' },
  { label: 'AI Career Coach',    to: '/chat',            icon: '🤖', gradient: 'from-emerald-500 to-emerald-700' },
  { label: 'Recommendations',    to: '/recommendations', icon: '⭐', gradient: 'from-blue-500 to-blue-700' },
  { label: 'Track Applications', to: '/applications',    icon: '📋', gradient: 'from-teal-500 to-teal-700' },
];

const STATUS_STYLES = {
  APPLIED:   'bg-blue-100 text-blue-700',
  INTERVIEW: 'bg-amber-100 text-amber-800',
  REJECTED:  'bg-red-100 text-red-700',
  OFFER:     'bg-emerald-100 text-emerald-700',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
};

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 card-shadow">
      <div className="shimmer h-8 w-16 rounded-lg mb-2" />
      <div className="shimmer h-4 w-24 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 card-shadow">
      <div className="shimmer h-4 w-48 rounded mb-2" />
      <div className="shimmer h-3 w-32 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const result = await getDashboard();
        setData(result);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const stats = data ? [
    { label: 'Saved Jobs',    value: data.savedJobsCount,    icon: '🔖', color: 'text-indigo-600 dark:text-indigo-400',  ring: 'ring-indigo-100',  bg: 'bg-indigo-50 dark:bg-indigo-500/20',  to: '/saved-jobs'    },
    { label: 'Applications', value: data.applicationsCount, icon: '📋', color: 'text-violet-600 dark:text-violet-400',  ring: 'ring-violet-100',  bg: 'bg-violet-50 dark:bg-violet-500/20',  to: '/applications' },
    { label: 'Resume Score',  value: data.resumeScore !== null ? `${data.resumeScore}%` : 'N/A', icon: '📄', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-100', bg: 'bg-emerald-50 dark:bg-emerald-500/20', to: '/resume' },
    { label: 'AI Coach Chats', value: data.aiChatsCount,     icon: '🤖', color: 'text-blue-600 dark:text-blue-400',     ring: 'ring-blue-100',     bg: 'bg-blue-50 dark:bg-blue-500/20',     to: '/chat' },
    { label: 'Interviews',   value: data.interviewsCount,   icon: '🎤', color: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-100',   bg: 'bg-amber-50 dark:bg-amber-500/20',   to: '/applications' },
    { label: 'Offers',       value: data.offersCount,       icon: '🏆', color: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-100', bg: 'bg-teal-50 dark:bg-teal-500/20', to: '/applications' },
  ] : [];

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 flex-shrink-0">
              <span className="text-white text-xl font-black">{initials}</span>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {user?.name ? `Hi, ${user.name.split(' ')[0]}! 👋` : 'Dashboard'}
              </h1>
              <p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">Here's your activity overview</p>
            </div>
          </div>
          <Link
            to="/search"
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            🔍 Find Jobs
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {/* ── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {loading
            ? [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
            : stats.map((stat) => (
                <Link
                  key={stat.label}
                  to={stat.to}
                  className="group bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-0.5 block"
                >
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center text-lg mb-4 group-hover:scale-110 transition-transform`}>
                    {stat.icon}
                  </div>
                  <div className={`text-3xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 font-bold truncate">{stat.label}</div>
                </Link>
              ))
          }
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* ── Recent Applications ─────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recent Applications</h2>
              <Link to="/applications" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">View all →</Link>
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <SkeletonRow key={i} />)}</div>
            ) : !data?.recentApplications?.length ? (
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-8 text-center card-shadow">
                <div className="text-3xl mb-3">📋</div>
                <p className="text-slate-500 dark:text-zinc-400 text-sm mb-3">No applications yet.</p>
                <Link to="/search" className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Find jobs →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentApplications.map((app) => (
                  <div key={app.id} className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 flex items-center justify-between gap-3 card-shadow hover:card-shadow-hover transition-all duration-200">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">{app.jobTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{app.companyName} · {app.jobCity}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{formatDate(app.appliedAt)}</p>
                    </div>
                    <span className={`badge flex-shrink-0 ${STATUS_STYLES[app.status] || 'bg-slate-100 text-slate-500'}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Recently Saved Jobs ──────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Recently Saved</h2>
              <Link to="/saved-jobs" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">View all →</Link>
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <SkeletonRow key={i} />)}</div>
            ) : !data?.recentSavedJobs?.length ? (
              <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-8 text-center card-shadow">
                <div className="text-3xl mb-3">🔖</div>
                <p className="text-slate-500 dark:text-zinc-400 text-sm mb-3">No saved jobs yet.</p>
                <Link to="/search" className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Search now →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentSavedJobs.map((sj) => (
                  <Link
                    key={sj.savedId}
                    to={`/jobs/${sj.jobId}`}
                    className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 flex items-center justify-between gap-3 card-shadow hover:card-shadow-hover transition-all duration-200 block"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">{sj.jobTitle}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{sj.companyName} · {sj.jobCity}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{formatDate(sj.savedAt)}</p>
                    </div>
                    <span className="text-indigo-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Quick Links ─────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Quick Links</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-4">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={`group bg-gradient-to-br ${link.gradient} text-white rounded-2xl p-6 font-semibold text-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block`}
              >
                <span className="block text-2xl mb-3 group-hover:scale-110 transition-transform">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
