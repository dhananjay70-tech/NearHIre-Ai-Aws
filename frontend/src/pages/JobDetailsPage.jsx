import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJobById, trackJobView } from '../services/jobService';
import { saveJob, createApplication } from '../services/userDataService';

function formatSalary(min, max, period) {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;
  const range = min && max ? `${fmt(min)} – ${fmt(max)}` : fmt(min || max);
  if (period === 'STIPEND') return `${range} / month (stipend)`;
  if (period === 'MONTH') return `${range} / month`;
  return `${range} / year`;
}

function formatJobType(v) {
  return (v || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Deterministic commute estimates using Haversine distance
function estimateCommute(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return null;
  const d = distanceKm;
  const carMins = Math.round((d / 30) * 60);
  const bikeMins = Math.round((d / 25) * 60);
  const transitMins = Math.round((d / 18) * 60) + 10; // + buffer

  function fmtTime(mins) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return {
    car: fmtTime(carMins),
    bike: fmtTime(bikeMins),
    transit: fmtTime(transitMins),
    disclaimer: 'Estimated commute — not live traffic data',
  };
}

const META_BADGE_COLORS = [
  'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800',
  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800',
  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800',
  'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800',
  'bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-600',
];

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [saveStatus, setSaveStatus] = useState('');
  const [applyStatus, setApplyStatus] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getJobById(id);
        if (!data) {
          setError('Job not found.');
        } else {
          setJob(data);

          // Record the view. The backend de-duplicates per viewer within a
          // cooldown window, so a refresh will not inflate the count. Failure
          // here must never break the page, so it is fire-and-forget.
          trackJobView(id)
            .then((result) => {
              if (result?.counted) {
                setJob((prev) =>
                  prev
                    ? {
                        ...prev,
                        totalViews: result.totalViews,
                        uniqueViews: result.uniqueViews,
                        lastViewedAt: result.lastViewedAt,
                      }
                    : prev
                );
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load job details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaveStatus('saving');
    try {
      const result = await saveJob(id);
      setSaveStatus(result.data?.alreadySaved ? 'already' : 'saved');
    } catch (err) {
      setSaveStatus('error');
    }
  }

  async function handleApply() {
    setApplyStatus('applying');
    try {
      const result = await createApplication(id, 'APPLIED');
      setApplyStatus(result.data?.alreadyExists ? 'already' : 'applied');
      if (job?.applicationUrl) {
        window.open(job.applicationUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setApplyStatus('error');
      if (job?.applicationUrl) {
        window.open(job.applicationUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }

  const handleCopyDisplayId = useCallback(async () => {
    const text = job?.displayJobId || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('display');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  }, [job]);

  const handleCopyFullId = useCallback(async () => {
    const text = id || '';
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('full');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('error');
    }
  }, [id]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: job?.title || 'Job on NearHire.AI',
      text: `Check out this job: ${job?.title} at ${job?.company?.name || job?.company_name}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error — fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setCopyStatus('share');
        setTimeout(() => setCopyStatus(''), 2000);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('share');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  }, [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 pt-20 lg:pt-24 pb-10">
          <div className="shimmer h-4 w-28 rounded mb-8" />
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-8 card-shadow space-y-4">
            <div className="shimmer h-8 w-2/3 rounded-xl" />
            <div className="shimmer h-5 w-1/3 rounded" />
            <div className="shimmer h-4 w-1/4 rounded" />
            <div className="flex gap-2 mt-4">{[1,2,3].map(i => <div key={i} className="shimmer h-7 w-20 rounded-full" />)}</div>
            <div className="shimmer h-32 w-full rounded-xl mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">{error || 'Job not found'}</h2>
          <Link to="/search" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const requiredSkills = (job.skills || job.requiredSkills || []).filter(
    (s) => typeof s === 'object' && s.importance === 'REQUIRED'
  );
  const preferredSkills = (job.skills || job.preferredSkills || []).filter(
    (s) => typeof s === 'object' && s.importance === 'PREFERRED'
  );
  const salary = formatSalary(job.salary_min || job.salaryRaw?.min, job.salary_max || job.salaryRaw?.max, job.salary_period || job.salaryRaw?.period);

  const commute = job.distanceKm != null ? estimateCommute(job.distanceKm) : null;
  const dirLink = (job.latitude && job.longitude)
    ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 lg:pt-24 pb-10">
        {/* Back */}
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Search
        </Link>

        <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 card-shadow overflow-hidden fade-in-up">
          {/* Top color bar */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

          <div className="p-8">
            {/* ── Header ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{job.title}</h1>
                  {(job.company?.verified || job.company_verified) && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <p className="text-indigo-700 dark:text-indigo-400 font-bold text-lg">{job.company?.name || job.company_name}</p>
                {(job.company?.website || job.company_website) && (
                  <a
                    href={job.company?.website || job.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 dark:text-blue-400 hover:underline mt-0.5 block"
                  >
                    {job.company?.website || job.company_website}
                  </a>
                )}
                <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400 dark:text-zinc-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {[job.address, job.city, job.state, job.postal_code].filter(Boolean).join(', ')}
                  {job.distanceKm != null && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-semibold">· {job.distanceKm} km away</span>
                  )}
                </p>

                {/* Display Job ID row */}
                {job.displayJobId && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-zinc-500">Job ID:</span>
                    <code className="text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                      {job.displayJobId}
                    </code>
                    <button
                      id="btn-copy-display-id"
                      onClick={handleCopyDisplayId}
                      className="text-xs text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Copy display ID"
                    >
                      {copyStatus === 'display' ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    <button
                      onClick={handleShare}
                      className="text-xs text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Share this job"
                    >
                      {copyStatus === 'share' ? '✓ Link copied!' : '🔗 Share'}
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5 min-w-[190px]">
                <button
                  id="btn-save-job"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved' || saveStatus === 'already'}
                  className="w-full btn-secondary text-sm py-2.5 disabled:opacity-60"
                >
                  {saveStatus === 'saving' ? '⏳ Saving...'
                    : saveStatus === 'saved' ? '✓ Job Saved!'
                    : saveStatus === 'already' ? '✓ Already Saved'
                    : saveStatus === 'error' ? '⚠ Save Failed'
                    : '🔖 Save Job'}
                </button>

                <button
                  id="btn-apply-job"
                  onClick={handleApply}
                  disabled={applyStatus === 'applying'}
                  className="w-full btn-primary text-sm py-2.5 disabled:opacity-60"
                >
                  {applyStatus === 'applying' ? '⏳ Opening...'
                    : applyStatus === 'applied' ? '✓ Application Tracked'
                    : applyStatus === 'already' ? 'Already Applied → Open'
                    : '🚀 Apply on Official Website'}
                </button>

                <button
                  id="btn-analyze-resume"
                  onClick={() => navigate('/resume', { state: { jobId: id, jobTitle: job.title } })}
                  className="w-full btn-ghost border border-slate-200 dark:border-zinc-600 text-sm py-2.5"
                >
                  📄 Analyze Resume for This Job
                </button>

                {dirLink && (
                  <a
                    href={dirLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-ghost border border-emerald-200 dark:border-emerald-800 text-sm py-2.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-center"
                  >
                    🗺️ Get Directions
                  </a>
                )}
              </div>
            </div>

            {/* Apply notice */}
            {(applyStatus === 'applied' || applyStatus === 'already') && (
              <div className="mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                <span className="text-base">✅</span>
                <span>
                  {applyStatus === 'already'
                    ? 'This application is already tracked in NearHire.AI. The official website is opening.'
                    : 'Application recorded in NearHire.AI. You are being redirected to the official application page.'}
                </span>
              </div>
            )}

            <hr className="border-slate-100 dark:border-zinc-700 my-6" />

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                formatJobType(job.job_type || job.jobType),
                formatJobType(job.work_mode || job.workMode),
                salary,
                `${job.experience_min ?? job.experience?.min ?? 0}–${job.experience_max ?? job.experience?.max ?? 'Any'} yrs exp`,
                job.posted_at || job.postedAt ? `Posted ${new Date(job.posted_at || job.postedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}` : null,
              ].filter(Boolean).map((text, i) => (
                <span key={i} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${META_BADGE_COLORS[i] || META_BADGE_COLORS[4]}`}>
                  {text}
                </span>
              ))}
            </div>

            {/* Source + real view count */}
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-6 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Source: <span className="font-semibold text-slate-500 dark:text-zinc-400">{job.source?.label || job.source?.name || job.source_label || job.source_name || 'NearHire Demo'}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span
                className="inline-flex items-center gap-1.5"
                title={
                  job.uniqueViews != null
                    ? `${job.uniqueViews} unique viewer${job.uniqueViews === 1 ? '' : 's'}`
                    : undefined
                }
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="font-semibold text-slate-500 dark:text-zinc-400">
                  {(job.totalViews ?? 0).toLocaleString('en-IN')}
                </span>
                {(job.totalViews ?? 0) === 1 ? 'view' : 'views'}
              </span>
            </p>

            {/* Commute estimates */}
            {commute && (
              <section className="mb-6 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
                  🚗 Estimated Commute from Your Location
                </h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white dark:bg-zinc-950 rounded-xl p-3 border border-slate-100 dark:border-zinc-800">
                    <div className="text-lg mb-1">🚗</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-zinc-200">{commute.car}</div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Car</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 rounded-xl p-3 border border-slate-100 dark:border-zinc-800">
                    <div className="text-lg mb-1">🏍️</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-zinc-200">{commute.bike}</div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Two-Wheeler</div>
                  </div>
                  <div className="bg-white dark:bg-zinc-950 rounded-xl p-3 border border-slate-100 dark:border-zinc-800">
                    <div className="text-lg mb-1">🚌</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-zinc-200">{commute.transit}</div>
                    <div className="text-xs text-slate-400 dark:text-zinc-500">Public Transit</div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3 text-center italic">{commute.disclaimer}</p>
              </section>
            )}

            {/* Description */}
            <section className="mb-8">
              <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs">📝</span>
                Job Description
              </h2>
              <p className="text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-zinc-700/50 rounded-2xl p-5 border border-slate-100 dark:border-zinc-600">
                {job.description}
              </p>
            </section>

            {/* Requirements */}
            {job.requirements && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center text-xs">📋</span>
                  Requirements
                </h2>
                <p className="text-sm text-slate-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-zinc-700/50 rounded-2xl p-5 border border-slate-100 dark:border-zinc-600">
                  {job.requirements}
                </p>
              </section>
            )}

            {/* Required Skills */}
            {requiredSkills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200 mb-3">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {requiredSkills.map((s) => (
                    <span key={s.id || s.name} className="badge bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800">
                      {s.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {preferredSkills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-base font-bold text-slate-800 dark:text-zinc-200 mb-3">Preferred Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {preferredSkills.map((s) => (
                    <span key={s.id || s.name} className="badge bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                      {s.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Official link */}
            {(job.application_url || job.applicationUrl) && (
              <section className="mt-8 pt-6 border-t border-slate-100 dark:border-zinc-700">
                <a
                  href={job.application_url || job.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  🚀 Apply on Official Website
                </a>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">
                  Source: <span className="font-semibold text-slate-500 dark:text-zinc-400">
                    {job.source?.label || job.source?.name || job.source_label || job.source_name || 'NearHire'}
                  </span> · Clicking records this application in NearHire.AI and opens the official page.
                </p>
              </section>
            )}

            {/* Advanced: full UUID */}
            <section className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-700">
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                {showAdvanced ? '▾' : '▸'} Advanced details
              </button>
              {showAdvanced && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 dark:text-zinc-500">Full UUID:</span>
                  <code className="text-xs font-mono bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-600 break-all">
                    {id}
                  </code>
                  <button
                    id="btn-copy-full-uuid"
                    onClick={handleCopyFullId}
                    className="text-xs text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {copyStatus === 'full' ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
