"use client";

import { useState, useRef, useEffect } from "react";
import { saveProject, type StoredCharacter, type StoredWorld, type StoredPlot } from "@/lib/projectStore";

const COLOR = "#f5c842";
const BG    = "rgba(245,200,66,0.08)";
const API   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STORAGE_KEY = "bcs_director_messages";

const DEFAULT_PROMPTS = [
  "A lone astronaut discovers an alien signal buried beneath the Martian ice.",
  "Two rival street artists find themselves inside a painting they both created.",
  "A retired detective in 1940s Tokyo solves one final case — her own disappearance.",
  "In a city where music is illegal, a deaf girl hears the last song ever recorded.",
];

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
  action?: string | null;
  timestamp: number;
};

type CreateStatus = "idle" | "creating" | "done" | "error";

function uid() { return Math.random().toString(36).slice(2); }

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "I'm Bob Director — your AI creative co-pilot. Tell me your story idea and I'll orchestrate CharacterForge, WorldForge, PlotSmith, and every other module to bring it to life. What do you want to create today?",
  timestamp: 0,
};

export default function DirectorPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [WELCOME];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Message[];
        return parsed.length > 0 ? parsed : [WELCOME];
      }
    } catch { /* ignore */ }
    return [WELCOME];
  });

  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [prompts,     setPrompts]     = useState<string[]>(DEFAULT_PROMPTS);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editText,    setEditText]    = useState("");
  const [createStatus, setCreateStatus] = useState<CreateStatus>("idle");
  const [toast,       setToast]       = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const editRef    = useRef<HTMLTextAreaElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus edit textarea when editing starts
  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  // Load remote story prompts once
  useEffect(() => {
    fetch(`${API}/api/director/prompts`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.prompts)) setPrompts(d.prompts); })
      .catch(() => {});
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Send a message ──────────────────────────────────────────────────────────

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: uid(), role: "user", text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/director/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const aiMsg: Message = {
        id: uid(), role: "assistant",
        text: data.reply,
        suggestions: data.suggestions,
        action: data.action ?? null,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: uid(), role: "assistant",
        text: "The API isn't reachable right now. Start `docker compose up -d` to connect the backend.",
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  // ── Delete message ──────────────────────────────────────────────────────────

  function deleteMsg(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  // ── Start editing a user message ────────────────────────────────────────────

  function startEdit(msg: Message) {
    setEditingId(msg.id);
    setEditText(msg.text);
  }

  // ── Save edit + resend ──────────────────────────────────────────────────────

  async function saveEdit(id: string) {
    const newText = editText.trim();
    if (!newText) return;
    // Update the message text
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, text: newText } : m));
    setEditingId(null);
    // Remove everything after this message and resend
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      return prev.slice(0, idx + 1);
    });
    await send(newText);
  }

  // ── Resend a message as-is ──────────────────────────────────────────────────

  function resend(msg: Message) {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      return prev.slice(0, idx + 1);
    });
    send(msg.text);
  }

  // ── Create Everything button ────────────────────────────────────────────────

  async function createEverything() {
    setCreateStatus("creating");

    // Build a summary of the conversation for context
    const conversationText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.text)
      .join("\n\n");

    // Helper: attempt a fetch and return parsed JSON or null (never throws)
    async function tryFetch(url: string, body: object): Promise<Record<string, unknown> | null> {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    }

    // Derive a plausible name/world from the conversation text
    function deriveNameFromText(text: string): string {
      const words = text.split(/\s+/).filter((w) => w.length > 4 && /^[A-Za-z]/.test(w));
      return words.length > 0 ? words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase() : "Unnamed";
    }

    // ── Fire all three in parallel ───────────────────────────────────────────
    const [char, world, plot] = await Promise.all([
      tryFetch(`${API}/api/characters/generate`, { project_id: 1, prompt: conversationText.slice(0, 500), role: "protagonist" }),
      tryFetch(`${API}/api/worlds/generate`,     { project_id: 1, prompt: conversationText.slice(0, 500) }),
      tryFetch(`${API}/api/plotsmith/generate`,  { project_id: 1, premise: conversationText.slice(0, 300), genre: "sci-fi", num_panels: 6 }),
    ]);

    // ── Offline fallbacks — derive from conversation so store is always populated ──
    const charName  = (char as { name?: string } | null)?.name  ?? deriveNameFromText(conversationText);
    const worldName = (world as { name?: string } | null)?.name ?? `World of ${deriveNameFromText(conversationText)}`;

    const finalChar = char ?? {
      name: charName,
      role: "protagonist",
      backstory: `A protagonist shaped by: ${conversationText.slice(0, 120)}…`,
      personality: "Determined, complex, driven by a defining wound",
      appearance: "Distinctive silhouette — visual design to be developed",
      abilities: "Abilities emerging from their role and backstory",
      arc: "Begins defined by their past; ends choosing their future",
      ai_generated: true,
    };

    const finalWorld = world ?? {
      name: worldName,
      type: "sci-fi",
      overview: `A world built around this concept: ${conversationText.slice(0, 200)}`,
      geography: "Distinct regions defined by the world's core rule",
      factions: [
        { name: "The Ruling Power", description: "Controls the status quo", alignment: "Lawful Neutral" },
        { name: "The Resistance",   description: "Fights for change",       alignment: "Chaotic Good"   },
      ],
      timeline: [
        { era: "Before",    event: "The world as it was" },
        { era: "The Break", event: "The event that changed everything" },
        { era: "Now",       event: "Where the story begins" },
      ],
      rules: `Core rule derived from: ${conversationText.slice(0, 100)}`,
      ai_generated: true,
    };

    const finalPlot = plot ?? {
      premise: conversationText.slice(0, 200),
      act_one: [
        { beat: "Ordinary World",    description: `We meet ${charName} before everything changes.` },
        { beat: "Inciting Incident", description: "An unexpected event shatters the status quo." },
        { beat: "Break Into Act 2",  description: `${charName} commits to a path — no going back.` },
      ],
      act_two: [
        { beat: "Rising Stakes",  description: "Every step forward costs something." },
        { beat: "Midpoint Twist", description: "A revelation reframes the entire conflict." },
        { beat: "Dark Night",     description: `${charName} hits their lowest point.` },
      ],
      act_three: [
        { beat: "Revelation", description: `${charName} finds the key they've always had.` },
        { beat: "Climax",     description: "Final confrontation — everything learned is used." },
        { beat: "Resolution", description: "The world after — changed, and the cost made visible." },
      ],
      panels: [
        { panel: 1, type: "Wide",    action: `Establishing shot — ${worldName}. Dawn.`,              dialogue: "" },
        { panel: 2, type: "Medium",  action: `${charName} at rest, unaware of what's coming.`,       dialogue: '"Another day."' },
        { panel: 3, type: "Insert",  action: "Something catches their eye — the inciting detail.",   dialogue: "" },
        { panel: 4, type: "Close-up",action: `${charName}'s face: confusion, then recognition.`,     dialogue: '"No. This can\'t be right."' },
        { panel: 5, type: "Wide",    action: "They act — the point of no return.",                   dialogue: "" },
        { panel: 6, type: "Medium",  action: "The door closes behind them. The story has begun.",    dialogue: "…" },
      ],
      ai_generated: true,
    };

    // ── Write to shared store so all modules pick up the content ────────────
    saveProject({
      characters: [finalChar as unknown as StoredCharacter],
      world:      finalWorld as unknown as StoredWorld,
      plot:       finalPlot  as unknown as StoredPlot,
    });

    setCreateStatus("done");
    setToast(`✓ Created — CharacterForge: ${charName} · WorldForge: ${worldName} · PlotSmith: 3-act structure ready`);

    setMessages((prev) => [...prev, {
      id: uid(), role: "assistant",
      text: `Done! I've generated **${charName}** as your protagonist, built **${worldName}**, and outlined the full 3-act structure. Open CharacterForge, WorldForge, or PlotSmith to review and refine — all data flows from CanonCore.`,
      timestamp: Date.now(),
    }]);

    setTimeout(() => setCreateStatus("idle"), 3000);
  }

  // ── Clear chat ──────────────────────────────────────────────────────────────

  function clearChat() {
    if (confirm("Clear all chat history?")) {
      setMessages([WELCOME]);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const userMessageCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-col flex-1 h-full" style={{ background: "var(--bg)" }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{
            transform: "translateX(-50%)",
            background: createStatus === "error" ? "#ef4444" : "#10b981",
            color: "#fff",
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-8 py-3 sm:py-5 shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold leading-tight" style={{ color: "var(--ink)" }}>
            Bob Director<span className="text-[10px] align-super ml-0.5 opacity-50">™</span>
          </h1>
          <p className="text-[11px] sm:text-[12px] hidden sm:block" style={{ color: "var(--ink-muted)" }}>AI Creative Co-Pilot · Orchestration Layer</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3 flex-wrap">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: loading ? "#f97316" : COLOR }} />
          <span className="text-[11px] hidden sm:inline" style={{ color: "var(--ink-muted)" }}>
            {loading ? "Thinking…" : "Standing by"}
          </span>

          {/* Create Everything button */}
          {userMessageCount > 0 && (
            <button
              onClick={createEverything}
              disabled={createStatus === "creating" || loading}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold rounded-lg transition-all disabled:opacity-50"
              style={{ background: COLOR, color: "#0d0d0f", cursor: "pointer" }}
            >
              {createStatus === "creating" ? (
                <><span className="w-3 h-3 border-2 border-[#0d0d0f] border-t-transparent rounded-full animate-spin" />Creating…</>
              ) : createStatus === "done" ? "✓ Done!" : "⚡ Create All"}
            </button>
          )}

          {/* Clear chat */}
          <button
            onClick={clearChat}
            className="text-[11px] px-2 py-1 rounded-lg transition-all hover:opacity-70"
            style={{ color: "var(--ink-faint)", cursor: "pointer", border: "1px solid var(--border)" }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat area — messages + right panel stack vertically on mobile */}
      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex flex-col flex-1 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6 gap-4 sm:gap-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 group ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 border-2 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: COLOR }}>
                  <span className="text-[10px] font-bold" style={{ color: COLOR }}>B</span>
                </div>
              )}

              <div className="max-w-[75%] flex flex-col gap-2">
                {/* Message bubble */}
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      ref={editRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
                      style={{
                        background: "var(--panel)",
                        border: `1px solid ${COLOR}`,
                        color: "var(--ink)",
                        minWidth: 280,
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(msg.id)}
                        className="px-3 py-1 text-[12px] font-bold rounded-lg"
                        style={{ background: COLOR, color: "#0d0d0f", cursor: "pointer" }}
                      >
                        Save & Resend
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-[12px] rounded-lg"
                        style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="px-4 py-3 rounded-xl text-sm leading-relaxed"
                    style={{
                      background: msg.role === "user" ? "var(--panel)" : "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--ink)",
                    }}
                  >
                    {msg.text}
                  </div>
                )}

                {/* Suggestion chips */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-col gap-1.5 pl-1">
                    {msg.suggestions.map((s, si) => (
                      <button
                        key={si}
                        onClick={() => setInput(s)}
                        className="text-left text-[11px] px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ border: `1px solid ${COLOR}40`, color: COLOR, background: BG, cursor: "pointer" }}
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message action icons — visible on hover */}
                {msg.id !== "welcome" && editingId !== msg.id && (
                  <div
                    className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
                  >
                    {msg.role === "user" && (
                      <>
                        {/* Edit */}
                        <button
                          onClick={() => startEdit(msg)}
                          title="Edit & resend"
                          className="w-6 h-6 rounded flex items-center justify-center transition-all hover:opacity-80"
                          style={{ background: "var(--panel)", color: "var(--ink-muted)", cursor: "pointer" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* Resend */}
                        <button
                          onClick={() => resend(msg)}
                          title="Resend"
                          className="w-6 h-6 rounded flex items-center justify-center transition-all hover:opacity-80"
                          style={{ background: "var(--panel)", color: "var(--ink-muted)", cursor: "pointer" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M2 8C2 4.69 4.69 2 8 2C10.21 2 12.16 3.17 13.24 4.93M14 8C14 11.31 11.31 14 8 14C5.79 14 3.84 12.83 2.76 11.07" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M13 2V5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </>
                    )}
                    {/* Delete — both user and assistant */}
                    <button
                      onClick={() => deleteMsg(msg.id)}
                      title="Delete"
                      className="w-6 h-6 rounded flex items-center justify-center transition-all hover:opacity-80"
                      style={{ background: "var(--panel)", color: "#ef4444", cursor: "pointer" }}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <path d="M3 4H13M6 4V2H10V4M5 4V13H11V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 border-2 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: COLOR }}>
                <span className="text-[10px] font-bold" style={{ color: COLOR }}>B</span>
              </div>
              <div className="px-4 py-3 rounded-xl flex items-center gap-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLOR, animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLOR, animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: COLOR, animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Right panel — below messages on mobile, fixed column on desktop */}
        <div className="sm:w-[240px] shrink-0 overflow-y-auto p-3 sm:p-4 sm:max-h-none"
          style={{ borderTop: "1px solid var(--border)", borderLeft: "none" }}
          // sm: override via className below
        >
          <style>{`@media (min-width:640px){.director-right{border-left:1px solid var(--border);border-top:none;}}`}</style>
          <div className="director-right h-full">
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2 sm:mb-3" style={{ color: "var(--ink-faint)" }}>Story Prompts</div>
            {/* On mobile show as horizontal scroll row; on desktop show as column */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
              {prompts.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="text-left text-[11px] sm:text-[12px] rounded-lg px-3 py-2 transition-all duration-150 leading-relaxed hover:opacity-80 shrink-0 sm:shrink"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", background: "var(--surface)", cursor: "pointer",
                    maxWidth: "80vw", minWidth: 160 }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-3 sm:mt-6 text-[10px] font-bold tracking-[0.15em] uppercase mb-2 sm:mb-3" style={{ color: "var(--ink-faint)" }}>Active Context</div>
            <div className="flex gap-3 overflow-x-auto sm:flex-col sm:gap-0 sm:overflow-visible">
              {[
                { label: "Messages", value: `${userMessageCount} sent` },
                { label: "Characters", value: "3 in CanonCore" },
                { label: "World", value: "The Shattered Grid" },
                { label: "Plot", value: "3-act arc active" },
              ].map((item) => (
                <div key={item.label} className="text-[11px] shrink-0 sm:shrink flex items-center sm:justify-between py-1 gap-1 sm:gap-0"
                  style={{ borderBottom: "1px solid var(--panel)" }}>
                  <span style={{ color: "var(--ink-muted)" }}>{item.label}:</span>
                  <span style={{ color: "var(--ink-faint)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-3 sm:px-8 py-3 sm:py-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
        <div className="flex items-end gap-2 sm:gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Describe your story idea…"
            rows={2}
            className="flex-1 resize-none rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm focus:outline-none transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm font-bold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: COLOR, color: "#0d0d0f", cursor: "pointer" }}
          >
            Direct
          </button>
        </div>
        <div className="mt-1.5 text-[10px] hidden sm:block" style={{ color: "var(--ink-faint)" }}>
          Enter to send · Shift+Enter for new line · Hover messages to edit, resend, or delete
        </div>
      </div>
    </div>
  );
}
