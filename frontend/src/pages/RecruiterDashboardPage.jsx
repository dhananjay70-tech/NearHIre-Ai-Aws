import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecruiterDashboard, getRecruiterJobs, deleteJob } from "../services/recruiterService";

const STAT_CARDS = [
  { key: "totalJobs",    label: "Total Jobs",    icon: "📋", color: "from-indigo-500 to-indigo-700" },
  { key: "activeJobs",   label: "Active Jobs",   icon: "✅", color: "from-emerald-500 to-emerald-700" },
  { key: "totalViews",   label: "Total Views",   icon: "👁️", color: "from-blue-500 to-blue-700" },
  { key: "applications", label: "Applications",  icon: "📩", color: "from-violet-500 to-violet-700" },
  { key: "expiredJobs",  label: "Expired Jobs",  icon: "⏰", color: "from-amber-500 to-amber-700" },
];

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value ?? "—"}</p>
      <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">{label}</p>
    </div>
  );
}

function JobRow({ job, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    if (!window.confirm("Delete this job posting?")) return;
    setDeleting(true);
    try { await onDelete(job.id); } finally { setDeleting(false); }
  }
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate">{job.title}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">{job.location} · {job.jobType || "Full Time"}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
          job.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}>{job.status || "Active"}</span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500">{job.applications || 0} applicants</span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500" title={`${job.uniqueViews ?? 0} unique viewers`}>
          👁 {(job.totalViews ?? 0).toLocaleString("en-IN")} views
        </span>
        <Link to="/recruiter/post-job" state={{ editJob: job }}
          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Edit</Link>
        <button onClick={handleDelete} disabled={deleting}
          className="text-[10px] font-bold text-red-500 hover:text-red-600 disabled:opacity-50">
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function RecruiterDashboardPage() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [dashData, jobsData] = await Promise.allSettled([
        getRecruiterDashboard(),
        getRecruiterJobs(),
      ]);
      if (dashData.status === "fulfilled") setStats(dashData.value);
      if (jobsData.status === "fulfilled") setJobs(jobsData.value?.jobs || jobsData.value || []);
    } catch (err) {
      setError("Could not load dashboard. Make sure the recruiter backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    await deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Recruiter Dashboard</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Manage your job postings and applicants</p>
          </div>
          <div className="flex gap-3">
            <Link to="/recruiter/applicants"
              className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-sm font-bold text-slate-700 dark:text-zinc-200 hover:border-indigo-400 transition">
              👥 Applicants
            </Link>
            <Link to="/recruiter/post-job"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-sm font-black text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition">
              + Post Job
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 h-28 animate-pulse" />
              ))
            : STAT_CARDS.map((s) => (
                <StatCard key={s.key} icon={s.icon} label={s.label} value={stats?.[s.key]} color={s.color} />
              ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { to: "/recruiter/post-job",    label: "Post New Job",     icon: "➕", color: "from-indigo-500 to-violet-600" },
            { to: "/recruiter/applicants",  label: "View Applicants",  icon: "👥", color: "from-blue-500 to-blue-700" },
            { to: "/recruiter/post-job",    label: "Manage Jobs",      icon: "📋", color: "from-emerald-500 to-emerald-700" },
            { to: "/recruiter/applicants",  label: "Analytics",        icon: "📊", color: "from-violet-500 to-violet-700" },
          ].map((a) => (
            <Link key={a.label} to={a.to}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-br ${a.color} text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 transition-all duration-150`}>
              <span className="text-2xl">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>

        {/* Jobs list */}
        <div>
          <h2 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-4">Your Job Postings</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800">
              <div className="text-5xl mb-3">📭</div>
              <p className="font-bold text-slate-700 dark:text-zinc-300">No jobs posted yet</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 mb-4">Start by posting your first job opening</p>
              <Link to="/recruiter/post-job"
                className="inline-block px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-black rounded-xl shadow-lg">
                + Post First Job
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => <JobRow key={j.id} job={j} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
