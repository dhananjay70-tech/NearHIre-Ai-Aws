import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApplications, updateApplication, deleteApplication } from '../services/userDataService';

const STATUSES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'HR', 'OFFER', 'REJECTED', 'WITHDRAWN'];

// Timeline stages in chronological order
const TIMELINE_STAGES = [
  { key: 'APPLIED',    label: 'Applied',    icon: '📝' },
  { key: 'SCREENING',  label: 'Screening',  icon: '🔍' },
  { key: 'INTERVIEW',  label: 'Interview',  icon: '💬' },
  { key: 'HR',         label: 'HR Round',   icon: '🤝' },
  { key: 'OFFER',      label: 'Offer',      icon: '🏆' },
];

// Stage index for progress calculation
const STAGE_ORDER = { APPLIED: 0, SCREENING: 1, INTERVIEW: 2, HR: 3, OFFER: 4, REJECTED: -1, WITHDRAWN: -1 };

function ApplicationTimeline({ status }) {
  const currentIdx = STAGE_ORDER[status] ?? 0;
  const isTerminal = status === 'REJECTED' || status === 'WITHDRAWN';
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-700">
      <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Application Progress</p>
      <div className="flex items-center gap-0">
        {TIMELINE_STAGES.map((stage, i) => {
          const isDone   = !isTerminal && currentIdx > i;
          const isCurrent = !isTerminal && currentIdx === i;
          const isFuture = isTerminal || currentIdx < i;
          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-300 ${
                  isDone    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30'
                  : isCurrent ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 ring-4 ring-indigo-100 dark:ring-indigo-900/40'
                  : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500'
                }`}>
                  {isDone ? '✓' : stage.icon}
                </div>
                <p className={`text-[9px] font-bold mt-1.5 text-center ${
                  isCurrent ? 'text-indigo-600 dark:text-indigo-400'
                  : isDone  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-zinc-500'
                }`}>{stage.label}</p>
              </div>
              {i < TIMELINE_STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded transition-all duration-500 ${
                  isDone ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-zinc-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {isTerminal && (
        <div className={`mt-2 text-center text-xs font-bold ${
          status === 'REJECTED' ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'
        }`}>
          {status === 'REJECTED' ? '❌ Application Rejected' : '↩ Withdrawn'}
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG = {
  APPLIED:   { bg: 'bg-blue-50 dark:bg-blue-900/30',      text: 'text-blue-700 dark:text-blue-400',      border: 'border-blue-100 dark:border-blue-800',      dot: 'bg-blue-500'    },
  SCREENING: { bg: 'bg-sky-50 dark:bg-sky-900/30',        text: 'text-sky-700 dark:text-sky-400',        border: 'border-sky-100 dark:border-sky-800',        dot: 'bg-sky-500'     },
  INTERVIEW: { bg: 'bg-amber-50 dark:bg-amber-900/30',    text: 'text-amber-800 dark:text-amber-400',    border: 'border-amber-100 dark:border-amber-800',    dot: 'bg-amber-500'   },
  HR:        { bg: 'bg-violet-50 dark:bg-violet-900/30',  text: 'text-violet-700 dark:text-violet-400',  border: 'border-violet-100 dark:border-violet-800',  dot: 'bg-violet-500'  },
  REJECTED:  { bg: 'bg-red-50 dark:bg-red-900/30',        text: 'text-red-700 dark:text-red-400',        border: 'border-red-100 dark:border-red-800',        dot: 'bg-red-500'     },
  OFFER:     { bg: 'bg-emerald-50 dark:bg-emerald-900/30',text: 'text-emerald-700 dark:text-emerald-400',border: 'border-emerald-100 dark:border-emerald-800',dot: 'bg-emerald-500' },
  WITHDRAWN: { bg: 'bg-slate-100 dark:bg-zinc-700',       text: 'text-slate-600 dark:text-zinc-400',     border: 'border-slate-200 dark:border-zinc-600',     dot: 'bg-slate-400'   },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.WITHDRAWN;
  return (
    <span className={`inline-flex items-center gap-1.5 badge ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [editingId, setEditingId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await getApplications();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(app) {
    setEditingId(app.id);
    setEditNotes(app.notes || '');
    setEditStatus(app.status);
  }

  async function handleSaveEdit(id) {
    setSaving(true);
    try {
      await updateApplication(id, { status: editStatus, notes: editNotes });
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status: editStatus, notes: editNotes } : a
        )
      );
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update application.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete application.');
    }
  }

  function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatJobType(v) {
    return (v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const filtered = statusFilter === 'ALL'
    ? applications
    : applications.filter((a) => a.status === statusFilter);

  // Count per status
  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">My Applications</h1>
            <p className="text-slate-500 dark:text-zinc-400 text-sm mt-1">Track all your job applications in one place.</p>
          </div>
          <Link to="/search" className="btn-primary text-sm self-start sm:self-auto flex items-center gap-2">
            🔍 Find More Jobs
          </Link>
        </div>

        {/* Stats Strip */}
        {!loading && applications.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            {STATUSES.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
                  className={`rounded-2xl p-4 border text-left transition-all duration-200 ${
                    statusFilter === s
                      ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-indigo-300`
                      : 'bg-white dark:bg-zinc-800 border-slate-100 dark:border-zinc-700 hover:border-slate-200 dark:hover:border-zinc-600'
                  } card-shadow`}
                >
                  <div className={`text-2xl font-black ${cfg.text}`}>{counts[s] || 0}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">{s.charAt(0) + s.slice(1).toLowerCase()}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['ALL', ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
              }`}
            >
              {s === 'ALL' ? `All (${applications.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${counts[s] || 0})`}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 p-6 card-shadow">
                <div className="shimmer h-5 w-2/3 rounded mb-2" />
                <div className="shimmer h-4 w-1/3 rounded mb-4" />
                <div className="shimmer h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-3xl border border-slate-100 dark:border-zinc-700 card-shadow p-16 text-center fade-in-up">
            <div className="text-4xl mb-4">{statusFilter === 'ALL' ? '📋' : '🔍'}</div>
            <p className="text-lg font-bold text-slate-700 dark:text-zinc-200 mb-2">
              {statusFilter === 'ALL' ? 'No applications yet.' : `No ${statusFilter.toLowerCase()} applications.`}
            </p>
            {statusFilter === 'ALL' && (
              <Link to="/search" className="btn-primary inline-flex items-center gap-2 mt-4">
                Find Jobs to Apply
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => (
              <div key={app.id} className="bg-white dark:bg-zinc-800 rounded-2xl border border-slate-100 dark:border-zinc-700 card-shadow hover:card-shadow-hover transition-all duration-300 overflow-hidden fade-in-up">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">{app.job?.title}</h2>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">{app.job?.company?.name}</p>
                      <p className="text-sm text-slate-500 dark:text-zinc-400">
                        {app.job?.city}{app.job?.state ? `, ${app.job?.state}` : ''}
                        {app.job?.jobType && ` · ${formatJobType(app.job.jobType)}`}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5">Applied {formatDate(app.appliedAt)}</p>

                      {/* Application Timeline */}
                      {editingId !== app.id && <ApplicationTimeline status={app.status} />}

                      {app.notes && editingId !== app.id && (
                        <div className="mt-3 bg-slate-50 dark:bg-zinc-700 rounded-xl p-3 border border-slate-100 dark:border-zinc-600">
                          <p className="text-sm text-slate-600 dark:text-zinc-300">📝 {app.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <Link
                        to={`/jobs/${app.job?.id}`}
                        className="text-xs btn-secondary py-1.5 px-3"
                      >
                        View Job
                      </Link>
                      <button
                        onClick={() => startEdit(app)}
                        className="text-xs btn-ghost border border-slate-200 dark:border-zinc-600 py-1.5 px-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDelete(app.id)}
                        className="text-xs font-medium px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Form */}
                  {editingId === app.id && (
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-zinc-700">
                      <div className="flex flex-wrap gap-3 items-end mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Status</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="rounded-xl border border-slate-200 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 outline-none"
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Notes</label>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="input-base"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(app.id)}
                          disabled={saving}
                          className="btn-primary text-xs py-2 px-4 disabled:opacity-60"
                        >
                          {saving ? '⏳ Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-ghost border border-slate-200 dark:border-zinc-600 text-xs py-2 px-4"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {confirmDelete === app.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-700">
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-2xl p-4">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">Remove this application from your tracker?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="btn-ghost border border-slate-200 dark:border-zinc-600 text-xs py-2 px-4"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
