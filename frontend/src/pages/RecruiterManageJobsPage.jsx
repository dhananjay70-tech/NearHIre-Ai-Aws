import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getRecruiterJobs,
  deleteJob,
  updateJob,
  getRecruiterMeta,
} from "../services/recruiterService";

const STATUS_TABS = ["ALL", "ACTIVE", "CLOSED", "EXPIRED"];
const PAGE_SIZE = 10;

const STATUS_STYLE = {
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Closed: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  Expired: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function RecruiterManageJobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [jobTypes, setJobTypes] = useState([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [jobType, setJobType] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Enum values for the filter dropdown come from the backend.
  useEffect(() => {
    getRecruiterMeta()
      .then((meta) => setJobTypes(meta?.jobTypes || []))
      .catch(() => setJobTypes([]));
  }, []);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getRecruiterJobs({
        search: debouncedSearch,
        status: status === "ALL" ? "" : status,
        jobType,
        sortBy,
        page,
        limit: PAGE_SIZE,
      });
      setJobs(data?.jobs || []);
      setPagination(data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not load your jobs. Please try again."
      );
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, jobType, sortBy, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(job) {
    if (!window.confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      setBusyId(job.id);
      await deleteJob(job.id);
      // Step back a page if we just removed the only row on it.
      if (jobs.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete this job.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(job) {
    try {
      setBusyId(job.id);
      await updateJob(job.id, { isActive: !job.isActive });
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, isActive: !j.isActive, status: !j.isActive ? "Active" : "Closed" }
            : j
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not update job status.");
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = debouncedSearch || status !== "ALL" || jobType;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Manage Jobs</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              {loading ? "Loading…" : `${pagination.total} job${pagination.total === 1 ? "" : "s"} posted`}
            </p>
          </div>
          <Link
            to="/recruiter/post-job"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            + Post New Job
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 mb-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, city or company…"
              className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400"
            />
            <select
              value={jobType}
              onChange={(e) => { setJobType(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-700 dark:text-zinc-200"
            >
              <option value="">All job types</option>
              {jobTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2.5 text-sm text-slate-700 dark:text-zinc-200"
            >
              <option value="">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title (A–Z)</option>
              <option value="views">Most viewed</option>
              <option value="applicants">Most applicants</option>
            </select>
            <div className="flex gap-1.5 flex-wrap items-center">
              {STATUS_TABS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    status === s
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 p-4">
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="h-3 w-1/4 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-14 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-bold text-slate-800 dark:text-zinc-100 mb-1">
              {hasFilters ? "No jobs match these filters" : "You haven't posted any jobs yet"}
            </p>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
              {hasFilters
                ? "Try clearing the search or choosing a different status."
                : "Post your first job to start receiving applicants."}
            </p>
            {hasFilters ? (
              <button
                onClick={() => { setSearch(""); setStatus("ALL"); setJobType(""); setPage(1); }}
                className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-zinc-300"
              >
                Clear filters
              </button>
            ) : (
              <Link to="/recruiter/post-job" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">
                Post a Job
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 p-4 flex flex-col lg:flex-row lg:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 dark:text-zinc-100 text-sm truncate">{job.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[job.status] || STATUS_STYLE.Closed}`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {job.company} · {job.location} · {job.jobType?.replace("_", " ")}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    👁 {(job.totalViews ?? 0).toLocaleString("en-IN")} views · 📩 {job.applications ?? 0} applicants
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to="/recruiter/applicants"
                    state={{ jobId: job.id, jobTitle: job.title }}
                    className="text-[11px] font-bold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    Applicants
                  </Link>
                  <button
                    onClick={() => toggleStatus(job)}
                    disabled={busyId === job.id}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-1.5 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
                  >
                    {job.isActive ? "Close" : "Reopen"}
                  </button>
                  <button
                    onClick={() => navigate("/recruiter/post-job", { state: { editJob: job } })}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(job)}
                    disabled={busyId === job.id}
                    className="text-[11px] font-bold text-red-500 border border-red-200 dark:border-red-900 rounded-lg px-2.5 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                  >
                    {busyId === job.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2 text-sm font-bold text-slate-600 dark:text-zinc-300 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-sm text-slate-500 dark:text-zinc-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2 text-sm font-bold text-slate-600 dark:text-zinc-300 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
