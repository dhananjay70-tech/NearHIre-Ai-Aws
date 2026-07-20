import { useEffect, useState } from "react";
import { getApplicants, updateApplicantStatus } from "../services/recruiterService";

const STATUSES = ["PENDING", "SHORTLISTED", "INTERVIEW", "ACCEPTED", "REJECTED"];

const STATUS_STYLE = {
  PENDING:     "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  SHORTLISTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  INTERVIEW:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ACCEPTED:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function ScoreBar({ label, score }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const color = pct >= 70 ? "from-emerald-400 to-emerald-600"
    : pct >= 40 ? "from-amber-400 to-amber-600"
    : "from-red-400 to-red-600";
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RecruiterApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await getApplicants();
      setApplicants(data?.applicants || data || []);
    } catch {
      setError("Could not load applicants. Ensure recruiter backend is connected.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(appId, newStatus) {
    setUpdating(appId);
    try {
      await updateApplicantStatus(appId, newStatus);
      setApplicants((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  }

  const filtered = applicants.filter((a) => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchSearch = !search || (a.candidateName || "").toLowerCase().includes(search.toLowerCase())
      || (a.jobTitle || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">👥 Applicants</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              {applicants.length} total applicant{applicants.length !== 1 ? "s" : ""}
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or job…"
            className="w-full sm:w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-indigo-400 transition"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {["ALL", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === s
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-indigo-300"
              }`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <div className="text-5xl mb-3">👤</div>
            <p className="font-bold text-slate-700 dark:text-zinc-300">No applicants found</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Try changing your filter or wait for candidates to apply.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => (
              <div key={app.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-black text-lg shrink-0">
                    {(app.candidateName?.[0] || "?").toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-black text-slate-900 dark:text-white">{app.candidateName || "Unknown Candidate"}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[app.status] || STATUS_STYLE.PENDING}`}>
                        {app.status || "PENDING"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{app.jobTitle || "N/A"} · Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "recently"}</p>
                    {app.email && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{app.email}</p>}

                    {/* ATS + Match scores */}
                    {(app.atsScore != null || app.matchScore != null) && (
                      <div className="grid grid-cols-2 gap-3 mt-3 max-w-sm">
                        {app.atsScore != null && <ScoreBar label="ATS Score" score={app.atsScore} />}
                        {app.matchScore != null && <ScoreBar label="Match Score" score={app.matchScore} />}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {app.resumeUrl && (
                      <a href={app.resumeUrl} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:border-indigo-300 transition text-center">
                        📄 Resume
                      </a>
                    )}
                    <select
                      value={app.status || "PENDING"}
                      disabled={updating === app.id}
                      onChange={(e) => handleStatus(app.id, e.target.value)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 outline-none cursor-pointer disabled:opacity-50 transition"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
