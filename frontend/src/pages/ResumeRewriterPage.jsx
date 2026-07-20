import { useRef, useState } from "react";
import aiApi from "../services/aiApi";

const TONES = [
  { key: "professional", label: "Professional", icon: "💼" },
  { key: "leadership",   label: "Leadership",   icon: "🏆" },
  { key: "technical",    label: "Technical",     icon: "⚙️" },
  { key: "entry_level",  label: "Entry Level",   icon: "🌱" },
  { key: "senior_level", label: "Senior Level",  icon: "🚀" },
];

export default function ResumeRewriterPage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [tone, setTone] = useState("professional");
  const [original, setOriginal] = useState("");
  const [optimized, setOptimized] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function handleRewrite() {
    if (!resumeText.trim()) { setError("Please paste your resume text first."); return; }
    try {
      setLoading(true);
      setError("");
      setOriginal(resumeText);
      setOptimized("");
      const res = await aiApi.post("/resume/rewrite", { resumeText, jobDescription: jobDesc, tone });
      setOptimized(res.data?.data?.optimizedResume || res.data?.optimizedResume || "No result returned.");
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Rewrite failed. Make sure the AI backend is running.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleFileRead(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setResumeText(ev.target.result);
    reader.readAsText(file);
  }

  function downloadTxt(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-violet-200 dark:shadow-violet-900/30">✨</div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">AI Resume Rewriter</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-lg mx-auto">
            Paste your resume and optionally a job description. Our AI will rewrite it with powerful action verbs, optimized for ATS.
          </p>
        </div>

        {/* Tone Selector */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 mb-5 shadow-sm">
          <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Select Rewrite Tone</h3>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button key={t.key} onClick={() => setTone(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition duration-150 ${
                  tone === t.key
                    ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-transparent shadow-md"
                    : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-violet-400"
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Your Resume</h3>
              <button onClick={() => fileRef.current?.click()}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                📁 Upload .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt" onChange={handleFileRead} className="hidden" />
            </div>
            <textarea
              value={resumeText} onChange={(e) => setResumeText(e.target.value)}
              rows={14} placeholder="Paste your full resume text here…"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-violet-400 resize-none transition font-mono"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-3">
              Job Description <span className="text-slate-300 dark:text-zinc-600 normal-case font-normal">(optional — improves match)</span>
            </h3>
            <textarea
              value={jobDesc} onChange={(e) => setJobDesc(e.target.value)}
              rows={14} placeholder="Paste the job description here for keyword-optimized rewriting…"
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 outline-none focus:border-violet-400 resize-none transition font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Rewrite Button */}
        <div className="flex justify-center mb-8">
          <button onClick={handleRewrite} disabled={loading || !resumeText.trim()}
            className="px-8 py-4 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700
                       disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-violet-200 dark:shadow-violet-900/30
                       transition duration-150 flex items-center gap-3">
            {loading ? (
              <>
                <div className="flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
                AI is rewriting your resume…
              </>
            ) : (
              <>✨ Rewrite Resume with AI</>
            )}
          </button>
        </div>

        {/* Side-by-side comparison */}
        {(original || optimized) && (
          <div>
            <h2 className="text-sm font-black text-slate-700 dark:text-zinc-300 uppercase tracking-widest mb-4 text-center">
              📊 Side-by-Side Comparison
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-600 dark:text-zinc-400 uppercase tracking-widest">Original</span>
                  <button onClick={() => downloadTxt(original, "original-resume.txt")}
                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 transition">⬇ Download</button>
                </div>
                <pre className="p-5 text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-[500px]">
                  {original}
                </pre>
              </div>

              {/* Optimized */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-violet-200 dark:border-violet-800 overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase tracking-widest">AI Optimized</span>
                    <span className="text-[10px] bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">
                      {TONES.find(t => t.key === tone)?.label} Tone
                    </span>
                  </div>
                  <button onClick={() => downloadTxt(optimized, "optimized-resume.txt")}
                    className="text-[10px] font-bold text-violet-500 hover:text-violet-700 transition">⬇ Download</button>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="flex gap-2">
                      {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
                    </div>
                  </div>
                ) : (
                  <pre className="p-5 text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono overflow-auto max-h-[500px]">
                    {optimized || "Your AI-optimized resume will appear here…"}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
