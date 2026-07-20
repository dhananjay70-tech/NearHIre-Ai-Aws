import { useEffect, useState } from "react";
import coreApi from "../services/coreApi";

const TABS = ["Overview", "Users", "Recruiters", "Jobs", "Analytics"];

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 ${color}`}>{icon}</div>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value ?? "—"}</p>
      <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [tab, setTab] = useState("Overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [statsRes, usersRes, jobsRes] = await Promise.allSettled([
        coreApi.get("/admin/stats"),
        coreApi.get("/admin/users"),
        coreApi.get("/admin/jobs"),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data?.data || statsRes.value.data);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data?.data?.users || usersRes.value.data?.users || []);
      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.data?.data?.jobs || jobsRes.value.data?.jobs || []);
    } catch {
      setError("Admin panel requires admin access and backend setup.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(userId, active) {
    try {
      await coreApi.put(`/admin/users/${userId}`, { active: !active });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !active } : u));
    } catch { /* ignore */ }
  }

  async function deleteJobAdmin(jobId) {
    if (!window.confirm("Delete this job?")) return;
    try {
      await coreApi.delete(`/admin/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch { /* ignore */ }
  }

  const STAT_ITEMS = [
    { icon: "👥", label: "Total Users",      value: stats?.totalUsers,      color: "bg-indigo-100 dark:bg-indigo-900/40" },
    { icon: "🏢", label: "Recruiters",       value: stats?.totalRecruiters,  color: "bg-violet-100 dark:bg-violet-900/40" },
    { icon: "💼", label: "Total Jobs",       value: stats?.totalJobs,        color: "bg-blue-100 dark:bg-blue-900/40" },
    { icon: "📩", label: "Applications",     value: stats?.totalApplications,color: "bg-emerald-100 dark:bg-emerald-900/40" },
    { icon: "📄", label: "Resumes Uploaded", value: stats?.totalResumes,     color: "bg-amber-100 dark:bg-amber-900/40" },
    { icon: "🤖", label: "AI Chats",         value: stats?.totalAiChats,     color: "bg-teal-100 dark:bg-teal-900/40" },
    { icon: "👁️", label: "Job Views",        value: stats?.totalViews,       color: "bg-rose-100 dark:bg-rose-900/40" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-2xl shadow-lg">🛡️</div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">Manage users, recruiters, and platform data</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-zinc-900 rounded-2xl p-1 border border-slate-100 dark:border-zinc-800 shadow-sm mb-8 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 min-w-max px-4 py-2 rounded-xl text-xs font-black transition duration-150 ${
                tab === t
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === "Overview" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 animate-pulse" />
                ))
              : STAT_ITEMS.map(s => <StatCard key={s.label} {...s} />)
            }
          </div>
        )}

        {/* Users Tab */}
        {tab === "Users" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <p className="font-black text-slate-700 dark:text-zinc-200 text-sm">All Users ({users.length})</p>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-sm">Loading…</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400 dark:text-zinc-500 text-sm">No users found or admin API not connected.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {users.map((u) => (
                  <div key={u.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                      {(u.name?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-zinc-100 text-sm">{u.name || "Unknown"}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{u.email} · {u.role || "candidate"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.active !== false ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>{u.active !== false ? "Active" : "Suspended"}</span>
                      <button onClick={() => toggleUserStatus(u.id, u.active !== false)}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                        {u.active !== false ? "Suspend" : "Restore"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recruiters Tab */}
        {tab === "Recruiters" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">🏢</div>
            <p className="font-bold text-slate-700 dark:text-zinc-300">Recruiter management</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Approve, suspend, and manage recruiter accounts here.</p>
            <p className="text-xs text-amber-500 mt-2">Requires <code>/admin/recruiters</code> backend endpoint.</p>
          </div>
        )}

        {/* Jobs Tab */}
        {tab === "Jobs" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
              <p className="font-black text-slate-700 dark:text-zinc-200 text-sm">All Jobs ({jobs.length})</p>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-sm">Loading…</div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400 dark:text-zinc-500 text-sm">No jobs or admin API not connected.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {jobs.map((j) => (
                  <div key={j.id} className="px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate">{j.title}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        {j.company} · {j.location} · 👁 {(j.totalViews ?? 0).toLocaleString("en-IN")} views
                      </p>
                    </div>
                    <button onClick={() => deleteJobAdmin(j.id)}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 transition shrink-0">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === "Analytics" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">📊</div>
            <p className="font-bold text-slate-700 dark:text-zinc-300">Platform Analytics</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Signups, job views, application conversion rates.</p>
            <p className="text-xs text-amber-500 mt-2">Requires <code>/admin/analytics</code> backend endpoint.</p>
          </div>
        )}
      </div>
    </div>
  );
}
