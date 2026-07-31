"use client";

import { useState, useEffect } from "react";
import { loadProject, saveProject } from "@/lib/projectStore";

const COLOR = "#f97316";
const BG = "rgba(249,115,22,0.08)";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Beat   { beat: string; description: string }
interface Panel  { panel: number; location?: string; action: string; dialogue?: string; notes?: string; type?: string }
interface Plot {
  id?: number; premise: string;
  act_one: Beat[] | string; act_two: Beat[] | string; act_three: Beat[] | string;
  panels: Panel[] | string; ai_generated?: boolean;
}

const DEMO_PLOT: Plot = {
  id: 1,
  premise: "A data analyst turned fugitive must deliver evidence of mass human experimentation across a lawless wasteland before the man who ordered it erases both her and the truth.",
  act_one: [
    { beat: "Ordinary World",    description: "Nova's last day as an Architect analyst — competent, cynical, invisible." },
    { beat: "Inciting Incident", description: "She accidentally accesses File Zero — evidence of 10,000 unauthorised augmentations." },
    { beat: "Break Into Act 2",  description: "Her access is flagged; she has 4 minutes to copy the file and run." },
  ],
  act_two: [
    { beat: "Rising Stakes",  description: "Every node-to-node route is watched; she must go through the Barrens." },
    { beat: "Midpoint Twist", description: "Cee reveals the evidence destination — Node 7 — was destroyed last month." },
    { beat: "Dark Night",     description: "Nova is captured; the file appears to be wiped; Cee is missing." },
  ],
  act_three: [
    { beat: "Revelation",  description: "Cee memorised the file contents — the whole thing — on first read." },
    { beat: "Climax",      description: "Nova broadcasts via every physical data terminal in Node 1 simultaneously." },
    { beat: "Resolution",  description: "Voss is arrested; the augmentation programme is exposed; the Runners become the new network." },
  ],
  panels: [
    { panel: 1, type: "Wide",     action: "Aerial view of Node 1 at dawn — towers wrapped in power lines, muted light." },
    { panel: 2, type: "Medium",   action: "Nova at her workstation, scanning data quietly.", dialogue: '"Forty-two anomalies. Same as yesterday."' },
    { panel: 3, type: "Insert",   action: "Screen close-up: a file named ZERO with a red lock icon begins to open." },
    { panel: 4, type: "Medium",   action: "Nova's face — confusion, then recognition, then horror.", dialogue: '"No. No, no, no."' },
    { panel: 5, type: "Wide",     action: "She copies the file to a physical chip, heart rate visible in her augmented eye HUD." },
    { panel: 6, type: "Close-up", action: "A door opens behind her. Two Architect guards. Her hand closes around the chip.", dialogue: '"Ms Reyes. Step away from the terminal."' },
  ],
  ai_generated: true,
};

function parseBeats(raw: Beat[] | string): Beat[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}
function parsePanels(raw: Panel[] | string): Panel[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

const ACT_KEYS = ["act_one", "act_two", "act_three"] as const;
const ACT_LABELS: Record<typeof ACT_KEYS[number], string> = { act_one: "Act I", act_two: "Act II", act_three: "Act III" };

// Inline editable text — click to edit, blur/Enter to save
function InlineText({ value, multiline, placeholder, onChange, className, style }: {
  value: string; multiline?: boolean; placeholder?: string;
  onChange: (v: string) => void; className?: string; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { onChange(draft); setEditing(false); };
  if (editing) {
    const shared = {
      autoFocus: true, value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => { if (!multiline && e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } },
      style: { ...style, borderBottom: `1px solid ${COLOR}`, background: "transparent", outline: "none", width: "100%" },
    };
    return multiline
      ? <textarea {...shared} rows={3} className={`resize-none ${className ?? ""}`} />
      : <input {...shared} type="text" className={className} />;
  }
  return (
    <span onClick={() => setEditing(true)} title="Click to edit"
      className={`cursor-text hover:opacity-80 ${className ?? ""}`} style={style}>
      {value || <span style={{ color: "var(--ink-faint)", fontStyle: "italic" }}>{placeholder ?? "Click to add…"}</span>}
    </span>
  );
}

export default function PlotSmithPage() {
  const [plot,        setPlot]        = useState<Plot>(DEMO_PLOT);
  const [selectedAct, setSelectedAct] = useState<typeof ACT_KEYS[number]>("act_one");
  const [premise,     setPremise]     = useState("");
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    const stored = loadProject();
    if (stored.plot) { setPlot(stored.plot as Plot); return; }
    setLoading(true);
    fetch(`${API}/api/plotsmith/1`).then((r) => r.json())
      .then((data: Plot | null) => { if (data?.premise) { setPlot(data); saveProject({ plot: data }); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  function updatePlot(changes: Partial<Plot>) {
    const updated = { ...plot, ...changes };
    setPlot(updated); saveProject({ plot: updated });
  }

  function updateBeat(act: typeof ACT_KEYS[number], idx: number, changes: Partial<Beat>) {
    const beats = parseBeats(plot[act]);
    const updated = beats.map((b, i) => i === idx ? { ...b, ...changes } : b);
    updatePlot({ [act]: updated });
  }
  function addBeat(act: typeof ACT_KEYS[number]) {
    const beats = parseBeats(plot[act]);
    updatePlot({ [act]: [...beats, { beat: "New Beat", description: "Describe what happens here." }] });
  }
  function removeBeat(act: typeof ACT_KEYS[number], idx: number) {
    const beats = parseBeats(plot[act]);
    updatePlot({ [act]: beats.filter((_, i) => i !== idx) });
  }

  function updatePanel(idx: number, changes: Partial<Panel>) {
    const panels = parsePanels(plot.panels);
    const updated = panels.map((p, i) => i === idx ? { ...p, ...changes } : p);
    updatePlot({ panels: updated });
  }
  function addPanel() {
    const panels = parsePanels(plot.panels);
    const next = (panels[panels.length - 1]?.panel ?? 0) + 1;
    updatePlot({ panels: [...panels, { panel: next, type: "Medium", action: "Describe this panel.", dialogue: "" }] });
  }
  function removePanel(idx: number) {
    const panels = parsePanels(plot.panels);
    updatePlot({ panels: panels.filter((_, i) => i !== idx) });
  }

  async function handleGenerate() {
    if (!premise.trim()) return;
    setGenerating(true); setError(null);
    try {
      const res = await fetch(`${API}/api/plotsmith/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: 1, premise, genre: "sci-fi", num_panels: 6 }),
      });
      if (!res.ok) throw new Error();
      const newPlot: Plot = await res.json();
      setPlot(newPlot); saveProject({ plot: newPlot }); setPremise("");
    } catch {
      const fallback: Plot = {
        premise,
        act_one: [
          { beat: "Ordinary World",    description: `We meet our protagonist before everything changes.` },
          { beat: "Inciting Incident", description: "An unexpected event shatters the status quo." },
          { beat: "Break Into Act 2",  description: "The protagonist commits — no going back." },
        ],
        act_two: [
          { beat: "Rising Stakes",  description: "Every step forward costs something." },
          { beat: "Midpoint Twist", description: "A revelation reframes the entire conflict." },
          { beat: "Dark Night",     description: "The protagonist hits their lowest point." },
        ],
        act_three: [
          { beat: "Revelation", description: "The protagonist finds the key they've always had." },
          { beat: "Climax",     description: "Final confrontation — everything learned is used." },
          { beat: "Resolution", description: "The world after — changed, and the cost made visible." },
        ],
        panels: Array.from({ length: 6 }, (_, i) => ({
          panel: i + 1, type: "Medium", action: `Panel ${i + 1} — ${premise.slice(0, 50)}`, dialogue: "",
        })),
        ai_generated: true,
      };
      setPlot(fallback); saveProject({ plot: fallback }); setPremise("");
      setError("Backend offline — structure built from your premise. Click any field to edit.");
    } finally { setGenerating(false); }
  }

  const actBeats = parseBeats(plot[selectedAct]);
  const panels   = parsePanels(plot.panels);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M3 4H13M3 8H10M3 12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold leading-tight" style={{ color: "var(--ink)" }}>PlotSmith<span className="text-[10px] align-super ml-0.5 opacity-50">™</span></h1>
          <p className="text-[11px] sm:text-[12px] hidden sm:block" style={{ color: "var(--ink-muted)" }}>Story Structure & Script Generator</p>
        </div>
        <div className="ml-auto">
          <button onClick={() => { const blob = new Blob([JSON.stringify(plot, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "plot-script.json"; a.click(); }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-bold rounded-lg" style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
            Export
          </button>
        </div>
      </div>

      {/* Sidebar + main content stack vertically on mobile */}
      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {/* Sidebar — compact on mobile */}
        <div className="sm:w-[240px] shrink-0 sm:overflow-y-auto" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              {loading ? "Loading…" : "Story Structure"}
            </div>
          </div>

          {/* Premise generator */}
          <div className="p-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="text-[11px] mb-2" style={{ color: "var(--ink-muted)" }}>Generate from premise</div>
            <textarea value={premise} onChange={(e) => setPremise(e.target.value)}
              placeholder="Enter a premise…" rows={2}
              className="w-full rounded-lg px-2 py-1.5 text-[12px] resize-none focus:outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }} />
            <button onClick={handleGenerate} disabled={!premise.trim() || generating}
              className="mt-2 w-full py-1.5 text-[12px] font-bold rounded-lg disabled:opacity-40"
              style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
              {generating ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</span> : "Generate Structure"}
            </button>
            {error && <p className="mt-1 text-[11px]" style={{ color: "#f97316" }}>⚠ {error}</p>}
          </div>

          {/* Act list — horizontal tabs on mobile, vertical on desktop */}
          <div className="p-2 flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
            {ACT_KEYS.map((key) => {
              const beats = parseBeats(plot[key]);
              const isSelected = selectedAct === key;
              return (
                <button key={key} onClick={() => setSelectedAct(key)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors shrink-0 sm:shrink sm:w-full"
                  style={{ background: isSelected ? "var(--panel)" : "transparent", border: `1px solid ${isSelected ? "var(--border)" : "transparent"}`, cursor: "pointer" }}>
                  <span className="text-[11px] font-bold" style={{ color: "var(--ink)" }}>{ACT_LABELS[key]}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2" style={{ color: COLOR, background: BG }}>{beats.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-[680px]">
            {/* Premise — editable */}
            <div className="mb-6 p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "var(--ink-faint)" }}>Premise</div>
              <InlineText value={plot.premise} multiline onChange={(v) => updatePlot({ premise: v })}
                style={{ color: "var(--ink)", fontSize: 14, lineHeight: "1.7", display: "block" }}
                placeholder="Write your story premise…" />
            </div>

            {/* Act beats */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>{ACT_LABELS[selectedAct]} — Beats</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-muted)" }}>{actBeats.length} beats · click any field to edit</p>
              </div>
              <button onClick={() => addBeat(selectedAct)}
                className="px-3 py-1.5 text-[12px] font-bold rounded-lg"
                style={{ background: BG, color: COLOR, border: `1px solid ${COLOR}`, cursor: "pointer" }}>
                + Add Beat
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-8">
              {actBeats.map((beat, i) => (
                <div key={i} className="p-4 rounded-xl group" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <InlineText value={beat.beat} onChange={(v) => updateBeat(selectedAct, i, { beat: v })}
                      style={{ color: COLOR, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
                      placeholder="Beat name" />
                    <button onClick={() => removeBeat(selectedAct, i)}
                      className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity"
                      style={{ color: "#ef4444", cursor: "pointer" }}>✕</button>
                  </div>
                  <InlineText value={beat.description} multiline onChange={(v) => updateBeat(selectedAct, i, { description: v })}
                    style={{ color: "var(--ink)", fontSize: 14, lineHeight: "1.6", display: "block" }}
                    placeholder="Describe this beat…" />
                </div>
              ))}
            </div>

            {/* Panel script */}
            <div className="flex items-center justify-between pb-3 mb-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--ink-faint)" }}>
                Panel Script · Issue #1 · {panels.length} panels
              </div>
              <button onClick={addPanel} className="px-3 py-1 text-[11px] font-bold rounded-lg"
                style={{ background: BG, color: COLOR, border: `1px solid ${COLOR}`, cursor: "pointer" }}>
                + Add Panel
              </button>
            </div>

            <div className="flex flex-col gap-4 pb-8">
              {panels.map((panel, idx) => (
                <div key={panel.panel}
                  className="flex gap-4 p-4 rounded-xl group"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="text-center shrink-0 w-12">
                    <div className="text-lg font-bold leading-none" style={{ color: COLOR }}>
                      {String(panel.panel).padStart(2, "0")}
                    </div>
                    <InlineText value={panel.type ?? "Medium"} onChange={(v) => updatePanel(idx, { type: v })}
                      style={{ color: "var(--ink-faint)", fontSize: 10, textTransform: "uppercase" }} placeholder="Type" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <InlineText value={panel.action} multiline onChange={(v) => updatePanel(idx, { action: v })}
                      style={{ color: "var(--ink)", fontSize: 14, lineHeight: "1.6", display: "block" }}
                      placeholder="Describe panel action…" />
                    <div className="mt-2 flex items-start gap-1">
                      <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "var(--ink-faint)" }}>Dialogue:</span>
                      <InlineText value={panel.dialogue ?? ""} onChange={(v) => updatePanel(idx, { dialogue: v })}
                        style={{ color: "var(--ink-muted)", fontSize: 12, fontStyle: "italic" }}
                        placeholder="Add dialogue…" />
                    </div>
                    {panel.notes !== undefined && (
                      <div className="mt-1 flex items-start gap-1">
                        <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "var(--ink-faint)" }}>Notes:</span>
                        <InlineText value={panel.notes ?? ""} onChange={(v) => updatePanel(idx, { notes: v })}
                          style={{ color: "var(--ink-faint)", fontSize: 11 }} placeholder="Director notes…" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => removePanel(idx)}
                    className="opacity-0 group-hover:opacity-100 text-[11px] shrink-0 transition-opacity"
                    style={{ color: "#ef4444", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
