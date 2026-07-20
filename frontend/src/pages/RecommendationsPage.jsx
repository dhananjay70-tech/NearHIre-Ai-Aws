import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { getInterviewQuestions, getLearningRoadmap, getCoverLetter, getPreparationChecklist } from '../services/recommendationService';
import { saveJob } from '../services/userDataService';

function ScoreBar({ label, score, color = 'bg-indigo-500' }) {
  if (score == null) return null;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1.5">
        <span className="font-medium">{label}</span>
        <span className="font-bold text-slate-700 dark:text-zinc-200">{score}%</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-zinc-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ScoreRing({ score }) {
  const deg = Math.round((score / 100) * 360);
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#6366f1' : '#f59e0b';
  return (
    <div
      className="relative w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: `conic-gradient(${color} ${deg}deg, rgb(var(--border-color)) ${deg}deg)`,
      }}
    >
      <div className="absolute w-12 h-12 rounded-full bg-white dark:bg-zinc-950" />
      <span className="relative text-sm font-black" style={{ color }}>{score}%</span>
    </div>
  );
}

export default function RecommendationsPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const stateRecs = routerLocation.state?.recommendations;
  const stateSkills = routerLocation.state?.skills;

  const [recommendations, setRecommendations] = useState(stateRecs || null);
  const [skills, setSkills] = useState(stateSkills || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [agentData, setAgentData] = useState({});
  const [agentLoading, setAgentLoading] = useState({});

  const [saveStatus, setSaveStatus] = useState({});

  async function handleSave(jobId) {
    setSaveStatus((p) => ({ ...p, [jobId]: 'saving' }));
    try {
      const res = await saveJob(jobId);
      setSaveStatus((p) => ({ ...p, [jobId]: res.data?.alreadySaved ? 'already' : 'saved' }));
    } catch {
      setSaveStatus((p) => ({ ...p, [jobId]: 'error' }));
    }
  }

  async function fetchAI(jobId, type, job) {
    setAgentLoading((p) => ({ ...p, [`${jobId}-${type}`]: true }));
    try {
      let result;
      const ms = job.matchScore || {};
      if (type === 'questions') {
        result = await getInterviewQuestions({
          jobTitle: job.title,
          jobDescription: job.description || '',
          requiredSkills: ms.missingRequiredSkills || [],
          matchedSkills: ms.matchedSkills || [],
          missingSkills: ms.missingRequiredSkills || [],
        });
      } else if (type === 'roadmap') {
        result = await getLearningRoadmap({
          missingRequiredSkills: ms.missingRequiredSkills || [],
          jobTitle: job.title,
          currentSkills: ms.matchedSkills || [],
        });
      } else if (type === 'coverLetter') {
        result = await getCoverLetter({
          jobTitle: job.title,
          companyName: job.company_name || job.company?.name,
          jobDescription: job.description || '',
          extractedSkills: skills,
        });
      } else if (type === 'checklist') {
        result = await getPreparationChecklist({
          jobTitle: job.title,
          matchedSkills: ms.matchedSkills || [],
          missingSkills: ms.missingRequiredSkills || [],
        });
      }
      setAgentData((p) => ({
        ...p,
        [jobId]: { ...p[jobId], [type]: result?.data },
      }));
    } catch (err) {
      setAgentData((p) => ({
        ...p,
        [jobId]: {
          ...p[jobId],
          [type]: { available: false, message: err.response?.data?.detail || 'AI generation failed.' },
        },
      }));
    } finally {
      setAgentLoading((p) => ({ ...p, [`${jobId}-${type}`]: false }));
    }
  }

  if (!recommendations) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center px-4 pt-14">
        <div className="max-w-lg w-full text-center bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 p-12 card-shadow fade-in-up">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6">⭐</div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">No Recommendations Yet</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed mb-6">
            We haven't found matching job recommendations for your profile yet.
            Make sure your profile and resume are fully updated.
          </p>
          <Link to="/resume" className="btn-primary inline-flex items-center gap-2 text-sm py-3.5 px-6">
            📄 Update Resume & Skills
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 lg:pt-24 pb-10">
        {/* Header */}
        <div className="mb-8 fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center text-xl">⭐</div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">AI Recommendations</h1>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 text-sm ml-13">
            Jobs ranked by your skill match score using deterministic analysis.
            {skills.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs px-2.5 py-1 rounded-full">
                {skills.length} skills detected
              </span>
            )}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}

        {recommendations.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 card-shadow">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg font-semibold text-slate-600 dark:text-zinc-300 mb-2">No matching jobs found.</p>
            <Link to="/search" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium">Browse all jobs →</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {recommendations.map((job, idx) => {
              const ms = job.matchScore || {};
              const saved = saveStatus[job.id];
              const ad = agentData[job.id] || {};

              return (
                <div key={job.id} className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-100 dark:border-zinc-800 card-shadow hover:card-shadow-hover transition-all duration-300 overflow-hidden fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                  {/* Color bar based on score */}
                  <div
                    className="h-1 transition-all"
                    style={{
                      background: ms.overallScore >= 70
                        ? 'linear-gradient(90deg, #10b981, #059669)'
                        : ms.overallScore >= 40
                        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                        : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                    }}
                  />

                  <div className="p-6 sm:p-8">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Rank badge */}
                        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-black flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{job.title}</h2>
                          <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm mt-0.5">{job.company_name || job.company?.name}</p>
                          <p className="text-slate-500 dark:text-zinc-400 text-sm">{job.city}{job.state ? `, ${job.state}` : ''}</p>
                          {job.displayJobId && (
                            <p className="text-xs font-mono text-slate-400 dark:text-zinc-500 mt-0.5">{job.displayJobId}</p>
                          )}
                          {ms.distanceKm != null && (
                            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 font-medium">📍 {ms.distanceKm} km away</p>
                          )}
                        </div>
                      </div>

                      {/* Score ring */}
                      {ms.overallScore != null && <ScoreRing score={ms.overallScore} />}
                    </div>

                    {/* Score breakdown */}
                    <div className="mb-5 bg-slate-50 dark:bg-zinc-700/50 rounded-2xl p-4 border border-slate-100 dark:border-zinc-600">
                      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Score Breakdown</p>
                      <ScoreBar label="Required Skills" score={ms.requiredSkillScore} color="bg-indigo-500" />
                      <ScoreBar label="Preferred Skills" score={ms.preferredSkillScore} color="bg-violet-400" />
                      {ms.distanceScore != null && (
                        <ScoreBar label="Location" score={ms.distanceScore} color="bg-emerald-400" />
                      )}
                    </div>

                    {/* Skills */}
                    <div className="space-y-3 mb-5">
                      {ms.matchedSkills?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">✅ Matched Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ms.matchedSkills.map((s) => (
                              <span key={s} className="badge bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ms.missingRequiredSkills?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">❌ Missing Required</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ms.missingRequiredSkills.map((s) => (
                              <span key={s} className="badge bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {ms.missingPreferredSkills?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">⚠️ Missing Preferred</p>
                          <div className="flex flex-wrap gap-1.5">
                            {ms.missingPreferredSkills.map((s) => (
                              <span key={s} className="badge bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {ms.explanation && (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 italic mb-5 bg-slate-50 dark:bg-zinc-700/50 rounded-xl p-3 border border-slate-100 dark:border-zinc-600">{ms.explanation}</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        View Job
                      </Link>
                      <button
                        onClick={() => handleSave(job.id)}
                        disabled={saved === 'saving' || saved === 'saved' || saved === 'already'}
                        className="btn-secondary text-sm py-2 px-4 disabled:opacity-60"
                      >
                        {saved === 'saving' ? '⏳' : saved === 'saved' ? '✓ Saved' : saved === 'already' ? '✓ Already Saved' : '🔖 Save'}
                      </button>
                      <button
                        onClick={() => fetchAI(job.id, 'questions', job)}
                        disabled={agentLoading[`${job.id}-questions`]}
                        className="btn-ghost border border-slate-200 dark:border-zinc-600 text-sm py-2 px-3 disabled:opacity-60"
                      >
                        {agentLoading[`${job.id}-questions`] ? '⏳' : '🎤 Interview Qs'}
                      </button>
                      <button
                        onClick={() => fetchAI(job.id, 'roadmap', job)}
                        disabled={agentLoading[`${job.id}-roadmap`]}
                        className="btn-ghost border border-slate-200 dark:border-zinc-600 text-sm py-2 px-3 disabled:opacity-60"
                      >
                        {agentLoading[`${job.id}-roadmap`] ? '⏳' : '🗺️ Roadmap'}
                      </button>
                      <button
                        onClick={() => fetchAI(job.id, 'coverLetter', job)}
                        disabled={agentLoading[`${job.id}-coverLetter`]}
                        className="btn-ghost border border-slate-200 dark:border-zinc-600 text-sm py-2 px-3 disabled:opacity-60"
                      >
                        {agentLoading[`${job.id}-coverLetter`] ? '⏳' : '✉️ Cover Letter'}
                      </button>
                      <button
                        onClick={() => fetchAI(job.id, 'checklist', job)}
                        disabled={agentLoading[`${job.id}-checklist`]}
                        className="btn-ghost border border-slate-200 dark:border-zinc-600 text-sm py-2 px-3 disabled:opacity-60"
                      >
                        {agentLoading[`${job.id}-checklist`] ? '⏳' : '✅ Checklist'}
                      </button>
                    </div>

                    {/* AI Output Panels */}
                    {ad.questions && (
                      <div className="mt-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-5">
                        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                          <span className="text-base">🎤</span> Interview Questions
                        </h3>
                        {!ad.questions.available ? (
                          <p className="text-sm text-blue-600 dark:text-blue-400 italic">{ad.questions.message}</p>
                        ) : (
                          <div className="space-y-3 text-sm text-blue-700 dark:text-blue-200">
                            {ad.questions.data?.technical?.length > 0 && (
                              <div>
                                <p className="font-bold mb-1.5">Technical:</p>
                                <ol className="list-decimal list-inside space-y-1.5">
                                  {ad.questions.data.technical.map((q, i) => <li key={i}>{q}</li>)}
                                </ol>
                              </div>
                            )}
                            {ad.questions.data?.behavioural?.length > 0 && (
                              <div>
                                <p className="font-bold mt-3 mb-1.5">Behavioural:</p>
                                <ol className="list-decimal list-inside space-y-1.5">
                                  {ad.questions.data.behavioural.map((q, i) => <li key={i}>{q}</li>)}
                                </ol>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {ad.roadmap && (
                      <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 p-5">
                        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                          <span className="text-base">🗺️</span> Learning Roadmap
                        </h3>
                        {!ad.roadmap.available ? (
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 italic">{ad.roadmap.message}</p>
                        ) : (
                          <div className="space-y-2.5">
                            {ad.roadmap.data?.roadmap?.map((item, i) => (
                              <div key={i} className="flex items-start gap-3 text-sm text-emerald-800 dark:text-emerald-200">
                                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold mt-0.5 ${
                                  item.priority === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                  item.priority === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                }`}>{item.priority}</span>
                                <div>
                                  <span className="font-bold">{item.skill}</span>
                                  {item.estimatedTime && <span className="text-slate-500 dark:text-zinc-400"> · {item.estimatedTime}</span>}
                                  {item.resource && <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{item.resource}</p>}
                                </div>
                              </div>
                            ))}
                            {ad.roadmap.data?.totalEstimatedTime && (
                              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-800">
                                Total: {ad.roadmap.data.totalEstimatedTime}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {ad.coverLetter && (
                      <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 p-5">
                        <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                          <span className="text-base">✉️</span> Cover Letter
                        </h3>
                        {!ad.coverLetter.available ? (
                          <p className="text-sm text-purple-600 dark:text-purple-400 italic">{ad.coverLetter.message}</p>
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-zinc-200 whitespace-pre-line leading-relaxed">{ad.coverLetter.data?.coverLetter}</p>
                        )}
                      </div>
                    )}

                    {ad.checklist && (
                      <div className="mt-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800 p-5">
                        <h3 className="text-sm font-bold text-teal-800 dark:text-teal-300 mb-3 flex items-center gap-2">
                          <span className="text-base">✅</span> Preparation Checklist
                        </h3>
                        {!ad.checklist.available ? (
                          <p className="text-sm text-teal-600 dark:text-teal-400 italic">{ad.checklist.message}</p>
                        ) : (
                          <div className="space-y-3 text-sm">
                            {[
                              { key: 'week1', label: 'Week 1', color: 'text-indigo-700 dark:text-indigo-400' },
                              { key: 'week2', label: 'Week 2', color: 'text-blue-700 dark:text-blue-400' },
                              { key: 'beforeInterview', label: 'Before Interview', color: 'text-violet-700 dark:text-violet-400' },
                              { key: 'skillGaps', label: 'Skill Gap Focus', color: 'text-amber-700 dark:text-amber-400' },
                            ].map(({ key, label, color }) => (
                              ad.checklist.data?.checklist?.[key]?.length > 0 && (
                                <div key={key}>
                                  <p className={`font-bold ${color} mb-1`}>{label}</p>
                                  <ul className="space-y-1 text-teal-800 dark:text-teal-200">
                                    {ad.checklist.data.checklist[key].map((item, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-teal-400 dark:text-teal-300">□</span> {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
