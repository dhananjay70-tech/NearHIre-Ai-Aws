import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecruiterAnalytics, getRecruiterDashboard } from "../services/recruiterService";

const STATUS_COLOR = {
  PENDING: "bg-slate-400",
  SHORTLISTED: "bg-blue-500",
  INTERVIEW: "bg-violet-500",
  ACCEPTED: "bg-emerald-500",
  REJECTED: "bg-red-400",
  WITHDRAWN: "bg-amber-400",
};

export default function RecruiterAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        // Both requests in parallel — one render, no waterfall.
        const [a, d] = await Promise.all([
          getRecruiterAnalytics(),
          getRecruiterDashboard(),
        ]);
        if (cancelled) return;
        setAnalytics(a);
        setStats(d);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
            "Could not load analytics. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: "Jobs Posted", value: stats?.totalJobs, icon: "📋" },
    { label: "Active Jobs", value: stats?.activeJobs, icon: "✅" },
    { label: "Applications", value: stats?.applications, icon: "📩" },
    { label: "Total Views", value: analytics?.totalViews, icon: "👁️" },
    { label: "Unique Viewers", value: analytics?.uniqueViews, icon: "🧑" },
    { label: "Shortlisted", value: stats?.shortlisted, icon: "⭐" },
  ];

  const statusDist = analytics?.statusDistribution || [];
  const maxStatus = Math.max(1, ...statusDist.map((s) => s.count || 0));
  const mostViewed = analytics?.mostViewedJobs || [];
  const topJobs = analytics?.topPerformingJobs || [];
  const recent = stats?.recentApplicants || [];

  // Views -> applications conversion, computed from real numbers only.
  const conversion =
    analytics?.totalViews > 0
      ? ((stats?.applications || 0) / analytics.totalViews) * 100
      : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-40 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Real performance data across your job postings.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5">
              <div className="text-xl mb-1">{c.icon}</div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {c.value == null ? "—" : Number(c.value).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Conversion */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 mb-6">
          <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-1">View → Application conversion</p>
          {conversion == null ? (
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              No views recorded yet — share your jobs to start collecting data.
            </p>
          ) : (
            <>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{conversion.toFixed(1)}%</p>
              <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${Math.min(conversion, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5">
                {stats?.applications ?? 0} applications from {analytics?.totalViews ?? 0} views
              </p>
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Application status distribution */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5">
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-4">Applications by stage</p>
            {statusDist.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-6 text-center">
                No applications yet.
              </p>
            ) : (
              <div className="space-y-3">
                {statusDist.map((s) => (
                  <div key={s.status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600 dark:text-zinc-300">{s.status}</span>
                      <span className="text-slate-400 dark:text-zinc-500">{s.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_COLOR[s.status] || "bg-indigo-500"}`}
                        style={{ width: `${(s.count / maxStatus) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most viewed jobs */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5">
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-4">Most viewed jobs</p>
            {mostViewed.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-6 text-center">No jobs posted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {mostViewed.map((j, i) => (
                  <div key={j.id} className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300 dark:text-zinc-600 w-4">{i + 1}</span>
                    <span className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate">{j.title}</span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">👁 {(j.totalViews ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top jobs by applicants */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5">
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 mb-4">Top jobs by applicants</p>
            {topJobs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-6 text-center">No applications yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topJobs.map((j, i) => (
                  <div key={j.id} className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300 dark:text-zinc-600 w-4">{i + 1}</span>
                    <span className="flex-1 min-w-0 text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate">{j.title}</span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">📩 {j.applicants ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">Recent activity</p>
              <Link to="/recruiter/applicants" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                View all
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 py-6 text-center">No recent applications.</p>
            ) : (
              <div className="space-y-3">
                {recent.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-300 shrink-0">
                      {(a.applicantName || "?").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 truncate">
                        {a.applicantName}
                      </span>
                      <span className="block text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                        {a.jobTitle} · {a.status}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                      {a.appliedAt ? new Date(a.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
