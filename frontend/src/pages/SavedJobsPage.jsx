import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSavedJobs, unsaveJob } from '../services/userDataService';

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await getSavedJobs();
      setSavedJobs(data.savedJobs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load saved jobs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(jobId) {
    setRemoving(jobId);
    try {
      await unsaveJob(jobId);
      setSavedJobs((prev) => prev.filter((s) => s.job.id !== jobId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove job.');
    } finally {
      setRemoving(null);
    }
  }

  function formatJobType(v) {
    return (v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Saved Jobs</h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mt-0.5">
              {!loading && `${savedJobs.length} job${savedJobs.length !== 1 ? 's' : ''} bookmarked`}
            </p>
          </div>
          <Link to="/search" className="btn-primary text-sm flex items-center gap-2">
            🔍 Find More Jobs
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 card-shadow">
                <div className="shimmer h-5 w-2/3 rounded mb-3" />
                <div className="shimmer h-4 w-1/3 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="shimmer h-6 w-20 rounded-full" />
                  <div className="shimmer h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 card-shadow p-16 text-center fade-in-up">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-5">🔖</div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No saved jobs yet</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mb-6">Browse jobs and click "Save Job" to bookmark them here.</p>
            <Link to="/search" className="btn-primary inline-flex items-center gap-2">
              🔍 Search Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedJobs.map(({ savedId, savedAt, job }) => (
              <div
                key={savedId}
                className="group bg-white dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800 card-shadow hover:card-shadow-hover transition-all duration-300 overflow-hidden fade-in-up"
              >
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{job.title}</h2>
                      {job.company?.isVerified && (
                        <span className="badge bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">✓ Verified</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{job.company?.name}</p>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mb-3">
                      <svg className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {job.city}{job.state ? `, ${job.state}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {job.jobType && (
                        <span className="badge bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">{formatJobType(job.jobType)}</span>
                      )}
                      {job.workMode && (
                        <span className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">{formatJobType(job.workMode)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Saved on {formatDate(savedAt)}
                    </p>
                  </div>

                  <div className="flex gap-3 flex-shrink-0">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      View Job
                    </Link>
                    <button
                      onClick={() => handleRemove(job.id)}
                      disabled={removing === job.id}
                      className="text-sm font-medium px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 transition-all duration-200 disabled:opacity-60"
                    >
                      {removing === job.id ? '⏳' : 'Remove'}
                    </button>
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
