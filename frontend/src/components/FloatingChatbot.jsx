import { useEffect, useRef, useState } from "react";
import { getChatHistory, sendChatMessage } from "../services/chatService";

const SUGGESTED_PROMPTS = [
  "How do I improve my resume for a software role?",
  "What skills are in demand for DevOps in India?",
  "Give me salary negotiation tips",
  "How to prepare for a technical interview?",
  "Write a cover letter for a React developer role",
];

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load history when first opened
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      loadHistory();
    }
  }, [isOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending, isOpen, isMinimized]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  async function loadHistory() {
    try {
      setLoading(true);
      const res = await getChatHistory();
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch {
      // silently fail — chat is a bonus feature
    } finally {
      setLoading(false);
      setHistoryLoaded(true);
    }
  }

  async function handleSend(e) {
    e?.preventDefault();
    const cleanMsg = input.trim();
    if (!cleanMsg || sending) return;

    setInput("");
    setSending(true);

    const tempUser = {
      id: `u-${Date.now()}`,
      role: "USER",
      message: cleanMsg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const res = await sendChatMessage(cleanMsg);
      if (res.success) {
        const aiMsg = {
          id: `a-${Date.now()}`,
          role: "ASSISTANT",
          message: res.data,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        // If minimized, increment unread
        if (isMinimized) setUnreadCount((n) => n + 1);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "ASSISTANT",
          message: "Sorry, I couldn't connect right now. Please try again.",
          created_at: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function openChat() {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  }

  function minimize() {
    setIsMinimized(true);
    setIsFullscreen(false);
  }

  function closeChat() {
    setIsOpen(false);
    setIsMinimized(false);
    setIsFullscreen(false);
  }

  function toggleFullscreen() {
    setIsFullscreen((f) => !f);
    setIsMinimized(false);
  }

  function useSuggestion(prompt) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function formatTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const [dockSide, setDockSide] = useState(() => localStorage.getItem("chatbot_dock_side") || "right");

  function toggleDockSide() {
    const nextSide = dockSide === "right" ? "left" : "right";
    setDockSide(nextSide);
    localStorage.setItem("chatbot_dock_side", nextSide);
  }

  // Panel size & position classes with viewport constraints (max-w: 95vw, max-h: 90vh)
  const positionClass = dockSide === "left" ? "left-2 sm:left-4" : "right-2 sm:right-4";
  const fabPositionClass = dockSide === "left" ? "left-3 sm:left-5" : "right-3 sm:right-5";

  const panelClass = isFullscreen
    ? "fixed inset-3 sm:inset-6 z-[9999] max-w-[95vw] max-h-[90vh] mx-auto rounded-2xl"
    : `fixed bottom-4 sm:bottom-6 ${positionClass} z-[9999] w-[360px] sm:w-[400px] max-w-[95vw] h-[560px] max-h-[85vh] rounded-2xl`;

  return (
    <>
      {/* ── FAB Button ── */}
      {(!isOpen || isMinimized) && (
        <div className={`fixed bottom-4 sm:bottom-5 ${fabPositionClass} z-[9999] flex items-center gap-2`}>
          <button
            onClick={openChat}
            title="AI Career Coach"
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-2xl flex items-center justify-center
                       bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700
                       transition-all duration-200 hover:scale-110 active:scale-95 group relative"
            style={{ boxShadow: "0 8px 32px rgba(99,102,241,0.45)" }}
          >
            <span className="text-2xl select-none">🤖</span>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-20 group-hover:opacity-0" />
          </button>
          {/* Side toggle button next to FAB */}
          <button
            onClick={toggleDockSide}
            title={`Switch chatbot to ${dockSide === "right" ? "left" : "right"} side`}
            className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center justify-center text-xs font-bold shadow-md transition"
          >
            ⇄
          </button>
        </div>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && !isMinimized && (
        <div
          className={`${panelClass} flex flex-col overflow-hidden max-w-[95vw] max-h-[90vh]
                      bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700/80
                      shadow-2xl z-[9999]`}
          style={{
            boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
            animation: "chatSlideIn 0.25s cubic-bezier(.16,1,.3,1)",
          }}
        >
          {/* Header (Fixed height/shrink-0) */}
          <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 sm:px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-lg shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-black text-white leading-tight truncate">AI Career Coach</p>
              <p className="text-[10px] text-indigo-200 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online · Always Ready
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleDockSide}
                title={`Switch position to ${dockSide === "right" ? "left" : "right"} side`}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition"
              >
                ⇄
              </button>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition"
              >
                {isFullscreen ? "⊡" : "⤢"}
              </button>
              <button
                onClick={minimize}
                title="Minimize"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-base leading-none transition"
              >
                −
              </button>
              <button
                onClick={closeChat}
                title="Close"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/60 text-white flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area (Only scrollable area, min-h-0 prevents flex blowout) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 sm:px-4 py-3 space-y-3 bg-slate-50 dark:bg-zinc-950 scrollbar-thin">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <div className="flex gap-1 mb-2">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <p className="text-xs">Loading conversation…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-4">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-2">
                    💬
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Hi! How can I help?</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Ask about resumes, jobs, interviews, career paths…
                  </p>
                </div>
                {/* Suggested prompts */}
                <div className="space-y-1.5">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => useSuggestion(p)}
                      className="w-full text-left px-3 py-2 rounded-xl text-[11px] font-medium
                                 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700
                                 text-slate-700 dark:text-zinc-300
                                 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                                 transition duration-150"
                    >
                      💡 {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isUser = msg.role === "USER";
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-sm flex items-center justify-center shrink-0 mt-0.5">
                          🤖
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                          isUser
                            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-sm"
                            : msg.isError
                            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-tl-sm"
                            : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-tl-sm"
                        }`}
                      >
                        <p className="text-xs whitespace-pre-wrap leading-relaxed break-words">{msg.message}</p>
                        <p className={`text-[9px] mt-1 text-right font-medium ${isUser ? "text-indigo-200" : "text-slate-400 dark:text-zinc-500"}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {sending && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-sm flex items-center justify-center shrink-0">
                      🤖
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 p-3">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending || loading}
                placeholder="Ask me anything…"
                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700
                           rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-zinc-200
                           placeholder-slate-400 dark:placeholder-zinc-500
                           outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || loading}
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700
                           disabled:opacity-40 text-white rounded-xl px-4 py-2 text-xs font-bold
                           transition duration-150 shrink-0 flex items-center gap-1"
              >
                {sending ? "…" : "Send ➔"}
              </button>
            </form>
            <p className="text-[9px] text-center text-slate-400 dark:text-zinc-600 mt-2">
              AI Career Coach · NearHire
            </p>
          </div>
        </div>
      )}

      {/* ── Slide-in animation keyframe ── */}
      <style>{`
        @keyframes chatSlideIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  );
}
