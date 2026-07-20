import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getChatHistory, sendChatMessage } from "../services/chatService";

export default function CareerChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");
      const res = await getChatHistory();
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch (err) {
      setError("Failed to load chat history. Make sure Python backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSend(e) {
    e?.preventDefault();
    const cleanMsg = input.trim();
    if (!cleanMsg || sending) return;

    setInput("");
    setSending(true);
    setError("");

    // Optimistically add user message
    const tempUserMsg = {
      id: "temp-user",
      role: "USER",
      message: cleanMsg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendChatMessage(cleanMsg);
      if (res.success) {
        // Replace user + add assistant response
        const tempAssistantMsg = {
          id: "temp-assistant",
          role: "ASSISTANT",
          message: res.data,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev.filter(m => m.id !== "temp-user"), { ...tempUserMsg, id: undefined }, tempAssistantMsg]);
      }
    } catch (err) {
      setError("Failed to send message. Please try again.");
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter(m => m.id !== "temp-user"));
    } finally {
      setSending(false);
    }
  }

  // Helper to format timestamp
  function formatTime(isoStr) {
    if (!isoStr) return "";
    const date = new Date(isoStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-zinc-950 flex flex-col pt-16 sm:pt-20 pb-3 overflow-hidden">
      {/* Centered Fixed-Width Responsive Container */}
      <div className="w-full max-w-4xl mx-auto flex flex-col flex-1 h-full px-3 sm:px-6 min-h-0 relative">

        {/* Header Card */}
        <div className="flex-shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl px-4 sm:px-6 py-3.5 mb-3 shadow-sm flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-xl shadow-md shadow-indigo-500/20 text-white shrink-0">
              🤖
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">AI Career Coach</h1>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online & Ready to Assist
              </p>
            </div>
          </div>
          <Link
            to="/resume"
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 transition shrink-0"
          >
            📄 Resume Analysis
          </Link>
        </div>

        {/* Scrollable Message Area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 sm:px-4 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 pb-24">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs rounded-xl p-3 text-center">
              ⚠️ {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-zinc-500">
              <div className="animate-spin text-2xl mb-2">⏳</div>
              <p className="text-xs font-semibold">Consulting your career coach...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-8 sm:py-12 px-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-indigo-200/40 dark:border-indigo-800/40">
                💬
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white mb-1">Welcome to AI Career Coach!</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed mb-5">
                Ask me about resume writing tips, interview strategies, career transition support, or custom learning paths.
              </p>
              <div className="grid gap-2 text-left">
                {[
                  "How do I improve my software developer resume?",
                  "What skills do I need to learn for Cloud DevOps?",
                  "Give me tips for salary negotiation in India",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="p-3 text-xs bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl text-slate-700 dark:text-zinc-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition duration-150 text-left font-medium shadow-sm"
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === "USER";
                return (
                  <div key={index} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 mt-0.5">
                        🤖
                      </div>
                    )}
                    <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3.5 sm:p-4 shadow-sm ${
                      isUser
                        ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-xs"
                        : "bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 text-slate-800 dark:text-zinc-100 rounded-tl-xs"
                    }`}>
                      <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
                        {msg.message}
                      </p>
                      <p className={`text-[10px] mt-1.5 text-right font-medium ${isUser ? "text-indigo-200" : "text-slate-400 dark:text-zinc-500"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                    🤖
                  </div>
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl rounded-tl-xs p-4 text-slate-500 dark:text-zinc-400 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Floating Chat Input Container */}
        <div className="absolute bottom-2 inset-x-3 sm:inset-x-6 z-20">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 p-2 sm:p-2.5 rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-black/40">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending || loading}
                placeholder="Ask your career coach anything..."
                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || loading}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 text-white rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition duration-150 flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {sending ? "..." : "Send ➔"}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
