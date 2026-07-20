import { useState } from "react";
import aiApi from "../services/aiApi";

export default function LearningRoadmapPage() {
  const [skills, setSkills] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    const skillList = skills.split(",").map(s => s.trim()).filter(Boolean);
    if (!skillList.length && !targetRole.trim()) {
      setError("Please enter at least one skill to learn or a target role.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setRoadmap(null);
      const res = await aiApi.post("/resume/roadmap", {
        missingSkills: skillList,
        currentRole: currentRole.trim(),
        targetRole: targetRole.trim(),
      });
      setRoadmap(res.data?.data || res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to generate roadmap. Ensure the AI backend is running.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">🗺️</div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Learning Roadmap</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-lg mx-auto">
            Enter the skills you want to learn or your target role. Get a personalized week-by-week learning plan.
          </p>
        </div>

        {/* Input */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Current Role</label>
              <input value={currentRole} onChange={e => setCurrentRole(e.target.value)}
                placeholder="e.g., Junior Developer"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-emerald-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Target Role</label>
              <input value={targetRole} onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g., Full Stack Developer"
                className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-emerald-400 transition" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
              Skills to Learn <span className="text-slate-300 dark:text-zinc-600 normal-case font-normal">(comma-separated)</span>
            </label>
            <input value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="Docker, Redis, AWS, TypeScript, Kubernetes…"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-emerald-400 transition" />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">⚠️ {error}</div>
        )}

        <div className="flex justify-center mb-10">
          <button onClick={generate} disabled={loading}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700
                       disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30 transition">
            {loading ? "Generating roadmap…" : "🗺️ Generate My Roadmap"}
          </button>
        </div>

        {/* Roadmap Weeks */}
        {roadmap && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest text-center mb-6">
              📅 Your Personalized Learning Plan
            </h2>
            {(roadmap.weeks || roadmap.phases || []).map((week, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition">
                {/* Week header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                    W{i + 1}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">{week.title || `Week ${i + 1}`}</p>
                    {week.focus && <p className="text-xs text-slate-500 dark:text-zinc-400">{week.focus}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Topics */}
                  {week.topics?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">📚 Topics</p>
                      <ul className="space-y-1">
                        {week.topics.map((t, ti) => (
                          <li key={ti} className="text-xs text-slate-700 dark:text-zinc-300 flex items-start gap-1.5">
                            <span className="text-emerald-500 shrink-0 mt-0.5">•</span>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Projects */}
                  {week.projects?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">🛠 Projects</p>
                      <ul className="space-y-1">
                        {week.projects.map((p, pi) => (
                          <li key={pi} className="text-xs text-slate-700 dark:text-zinc-300 flex items-start gap-1.5">
                            <span className="text-blue-500 shrink-0 mt-0.5">▹</span>{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Resources */}
                  {week.resources?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">🔗 Resources</p>
                      <div className="flex flex-wrap gap-1.5">
                        {week.resources.map((r, ri) => (
                          <a key={ri} href={r.url || "#"} target="_blank" rel="noreferrer"
                            className="text-[10px] font-bold px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 transition">
                            {r.label || r.type || "Link"}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Practice questions */}
                {week.practiceQuestions?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">❓ Practice Questions</p>
                    <ul className="space-y-1">
                      {week.practiceQuestions.map((q, qi) => (
                        <li key={qi} className="text-xs text-slate-600 dark:text-zinc-400 flex items-start gap-2">
                          <span className="text-violet-400 shrink-0 mt-0.5 font-bold">{qi + 1}.</span>{q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Summary */}
            {roadmap.summary && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">💡 Summary</p>
                <p className="text-sm text-slate-700 dark:text-zinc-300">{roadmap.summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
