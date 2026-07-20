import { useRef, useState } from "react";
import aiApi from "../services/aiApi";

const DIFFICULTY_COLOR = { Easy: "text-emerald-600", Medium: "text-amber-600", Hard: "text-red-500" };
const PRIORITY_COLOR   = { High: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                           Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                           Low: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400" };

export default function SkillGapPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function analyze() {
    if (!resumeText.trim() || !jobDesc.trim()) {
      setError("Please provide both your resume and the job description.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      setResult(null);
      const res = await aiApi.post("/resume/skill-gap", { resumeText, jobDescription: jobDesc });
      setResult(res.data?.data || res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Analysis failed. Ensure the AI backend is running.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    new FileReader().onload = (ev) => setResumeText(ev.target.result);
    const reader = new FileReader();
    reader.onload = (ev) => setResumeText(ev.target.result);
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">🎯</div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Skill Gap Analysis</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-lg mx-auto">
            Compare your resume against a job description to find missing skills, learning priorities, and resources.
          </p>
        </div>

        {/* Input */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Your Resume *</h3>
              <button onClick={() => fileRef.current?.click()} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                📁 Upload .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt" onChange={handleFile} className="hidden" />
            </div>
            <textarea
              value={resumeText} onChange={(e) => setResumeText(e.target.value)}
              rows={12} placeholder="Paste your resume here…"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-blue-400 resize-none transition font-mono"
            />
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Job Description *</h3>
            <textarea
              value={jobDesc} onChange={(e) => setJobDesc(e.target.value)}
              rows={12} placeholder="Paste the target job description here…"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-blue-400 resize-none transition font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">⚠️ {error}</div>
        )}

        <div className="flex justify-center mb-10">
          <button onClick={analyze} disabled={loading || !resumeText.trim() || !jobDesc.trim()}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700
                       disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 dark:shadow-blue-900/30 transition duration-150">
            {loading ? "Analyzing…" : "🎯 Analyze Skill Gap"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Match score */}
            {result.matchScore != null && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm text-center">
                <p className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Overall Match Score</p>
                <div className="text-6xl font-black mb-2" style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  {result.matchScore}%
                </div>
                <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full max-w-xs mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-1000"
                    style={{ width: `${result.matchScore}%` }} />
                </div>
              </div>
            )}

            {/* Missing skills */}
            {result.missingSkills?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-4">🚫 Missing Skills</h3>
                <div className="space-y-4">
                  {result.missingSkills.map((skill, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-slate-50 dark:bg-zinc-800 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-black text-slate-800 dark:text-zinc-100 text-sm">{skill.skill || skill.name}</p>
                          {skill.priority && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLOR[skill.priority] || PRIORITY_COLOR.Low}`}>
                              {skill.priority} Priority
                            </span>
                          )}
                          {skill.difficulty && (
                            <span className={`text-[10px] font-bold ${DIFFICULTY_COLOR[skill.difficulty] || ""}`}>
                              {skill.difficulty}
                            </span>
                          )}
                        </div>
                        {skill.estimatedTime && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400">⏱ {skill.estimatedTime}</p>
                        )}
                      </div>
                      {/* Resources */}
                      {skill.resources?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {skill.resources.map((r, ri) => (
                            <a key={ri} href={r.url || "#"} target="_blank" rel="noreferrer"
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 transition">
                              {r.type === "youtube" ? "▶ YouTube" : r.type === "course" ? "📚 Course" : r.type === "doc" ? "📄 Docs" : r.type === "project" ? "🛠 Project" : r.label || "Link"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched skills */}
            {result.matchedSkills?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
                <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">✅ Matched Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {result.matchedSkills.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
