"use client";

import { useState, useEffect } from "react";
import { loadProject, saveProject } from "@/lib/projectStore";

const COLOR = "#10b981";
const BG = "rgba(16,185,129,0.08)";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Section = "overview" | "geography" | "factions" | "timeline";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "overview",  label: "Overview"  },
  { id: "geography", label: "Geography" },
  { id: "factions",  label: "Factions"  },
  { id: "timeline",  label: "Timeline"  },
];

interface Faction { name: string; description: string; alignment: string }
interface TimelineEntry { era: string; event: string }
interface World {
  id?: number; name: string; type: string; overview: string; geography: string;
  factions: string | Faction[]; timeline: string | TimelineEntry[];
  rules: string; ai_generated?: boolean;
}

const DEMO_WORLD: World = {
  id: 1, name: "The Shattered Grid", type: "sci-fi",
  overview: "Earth 2147 — after the Cascades (three simultaneous solar EMP events), civilisation reorganised into walled city-nodes connected by dangerous free-zones. Technology works, but the global network is gone forever.",
  geography: "12 surviving city-nodes across North America; The Barrens (lawless free-zones between nodes); underground data vaults beneath each node.",
  factions: [
    { name: "The Architects", description: "Engineers who control infrastructure and power within the nodes.", alignment: "Lawful Neutral" },
    { name: "Runners",        description: "Couriers and scouts of the free-zones — carriers of all physical data.", alignment: "Chaotic Good" },
    { name: "The Silent",     description: "A cult that believes the EMP was divine judgment on a hyper-connected world.", alignment: "Lawful Evil" },
  ],
  timeline: [
    { era: "Pre-Cascade",              event: "Global hyper-connectivity, AI governance, seamless data everywhere." },
    { era: "The Cascade (2099)",       event: "Three simultaneous solar EMPs destroy the global network in 90 seconds." },
    { era: "The Collapse (2099–2110)", event: "War, famine, mass migration to surviving city-nodes." },
    { era: "The Rebuild (2110–now)",   event: "Fragile order restored behind city walls. The Architects rise to power." },
    { era: "Story begins (2147)",      event: "Nova Reyes discovers File Zero — evidence of 10,000 unauthorised augmentations." },
  ],
  rules: "No wireless transmission works beyond 500m. All data travels physically by Runners. Power is rationed to 18 hours per day.",
  ai_generated: true,
};

function parseFactions(raw: string | Faction[]): Faction[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}
function parseTimeline(raw: string | TimelineEntry[]): TimelineEntry[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// Reusable inline editable text
function InlineText({ value, multiline, placeholder, onChange, style }: {
  value: string; multiline?: boolean; placeholder?: string;
  onChange: (v: string) => void; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  if (editing) {
    const props = {
      autoFocus: true, value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: () => { onChange(draft); setEditing(false); },
      onKeyDown: (e: React.KeyboardEvent) => { if (!multiline && e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") { setDraft(value); setEditing(false); } },
      className: "w-full bg-transparent focus:outline-none",
      style: { ...style, borderBottom: `1px solid ${COLOR}` },
    };
    return multiline
      ? <textarea {...props} rows={3} className="w-full bg-transparent focus:outline-none resize-none" />
      : <input {...props} type="text" />;
  }
  return (
    <span onClick={() => setEditing(true)} style={{ ...style, cursor: "text", borderBottom: "1px dashed transparent" }}
      className="hover:border-b hover:border-dashed" title="Click to edit">
      {value || <span style={{ color: "var(--ink-faint)", fontStyle: "italic" }}>{placeholder ?? "Click to edit…"}</span>}
    </span>
  );
}

export default function WorldForgePage() {
  const [section, setSection] = useState<Section>("overview");
  const [world, setWorld] = useState<World>(DEMO_WORLD);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadProject();
    if (stored.world) { setWorld(stored.world as World); return; }
    setLoading(true);
    fetch(`${API}/api/worlds/1`).then((r) => r.json())
      .then((data: World[]) => { if (Array.isArray(data) && data.length > 0) { setWorld(data[0]); saveProject({ world: data[0] }); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  function updateWorld(changes: Partial<World>) {
    const updated = { ...world, ...changes };
    setWorld(updated);
    saveProject({ world: updated });
  }

  async function handleGenerate() {
    if (!generatePrompt.trim()) return;
    setGenerating(true); setError(null);
    try {
      const res = await fetch(`${API}/api/worlds/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: 1, prompt: generatePrompt }),
      });
      if (!res.ok) throw new Error();
      const newWorld: World = await res.json();
      setWorld(newWorld); saveProject({ world: newWorld });
      setGeneratePrompt(""); setShowGenerateForm(false);
    } catch {
      const words = generatePrompt.split(" ").filter((w) => w.length > 3);
      const name = words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "New World";
      const fallback: World = {
        name, type: "sci-fi",
        overview: generatePrompt,
        geography: "Distinct regions defined by the world's core rule — expand in the Geography tab.",
        factions: [
          { name: "The Ruling Power", description: "Controls the status quo", alignment: "Lawful Neutral" },
          { name: "The Resistance",   description: "Fights for change",       alignment: "Chaotic Good" },
        ],
        timeline: [
          { era: "Before",    event: "The world as it was" },
          { era: "The Break", event: "The event that changed everything" },
          { era: "Now",       event: "Where the story begins" },
        ],
        rules: `Core rule derived from: ${generatePrompt.slice(0, 100)}`,
        ai_generated: true,
      };
      setWorld(fallback); saveProject({ world: fallback });
      setGeneratePrompt(""); setShowGenerateForm(false);
      setError("Backend offline — world created from your prompt. Click any field to edit.");
    } finally { setGenerating(false); }
  }

  const factions  = parseFactions(world.factions);
  const timeline  = parseTimeline(world.timeline);

  function updateFaction(idx: number, changes: Partial<Faction>) {
    const updated = factions.map((f, i) => i === idx ? { ...f, ...changes } : f);
    updateWorld({ factions: updated });
  }
  function addFaction() {
    updateWorld({ factions: [...factions, { name: "New Faction", description: "Describe this faction", alignment: "True Neutral" }] });
  }
  function removeFaction(idx: number) {
    updateWorld({ factions: factions.filter((_, i) => i !== idx) });
  }
  function updateTimelineEntry(idx: number, changes: Partial<TimelineEntry>) {
    const updated = timeline.map((t, i) => i === idx ? { ...t, ...changes } : t);
    updateWorld({ timeline: updated });
  }
  function addTimelineEntry() {
    updateWorld({ timeline: [...timeline, { era: "New Era", event: "Describe what happened" }] });
  }
  function removeTimelineEntry(idx: number) {
    updateWorld({ timeline: timeline.filter((_, i) => i !== idx) });
  }

  return (
    <div className="flex flex-col flex-1 p-6 max-w-[1000px] w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 8H14M8 2C6.5 4.5 6.5 11.5 8 14M8 2C9.5 4.5 9.5 11.5 8 14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ color: "var(--ink)" }}>WorldForge<span className="text-[10px] align-super ml-0.5 opacity-50">™</span></h1>
          <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>World Building & Setting Design</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowGenerateForm((v) => !v)}
            className="px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
            style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
            Generate World
          </button>
          <button onClick={() => { const name = prompt("New world name:"); if (name) updateWorld({ name, overview: "", geography: "", factions: [], timeline: [], rules: "", ai_generated: false }); }}
            className="px-4 py-2 text-sm font-bold rounded-lg" style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
            + New World
          </button>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-2 rounded-lg text-[12px]" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>⚠ {error}</div>}

      {/* Generate form */}
      {showGenerateForm && (
        <div className="rounded-xl p-4 mb-6 flex flex-wrap items-end gap-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Describe your world</label>
            <input type="text" value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. A fantasy empire where light is currency and darkness is outlawed"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }} />
          </div>
          <button onClick={handleGenerate} disabled={!generatePrompt.trim() || generating}
            className="px-4 py-2 text-sm font-bold rounded-lg disabled:opacity-40 shrink-0"
            style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
            {generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</span> : "Generate"}
          </button>
        </div>
      )}

      {/* World card — editable header */}
      <div className="rounded-xl p-5 mb-6 flex items-start gap-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR, border: `2px solid ${COLOR}` }}>
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 8H14M8 2C6.5 4.5 6.5 11.5 8 14M8 2C9.5 4.5 9.5 11.5 8 14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <InlineText value={world.name} onChange={(v) => updateWorld({ name: v })}
              style={{ color: "var(--ink)", fontWeight: 700, fontSize: 18 }} placeholder="World name" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: BG, color: COLOR }}>
              {loading ? "Loading…" : "Active World"}
            </span>
            {world.ai_generated && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,92,216,0.12)", color: "#7c5cd8" }}>AI GENERATED</span>}
          </div>
          <InlineText value={world.overview} multiline onChange={(v) => updateWorld({ overview: v })}
            style={{ color: "var(--ink-muted)", fontSize: 14, lineHeight: "1.6", display: "block" }}
            placeholder="Describe your world…" />
          {world.rules && (
            <div className="mt-2 flex items-start gap-1">
              <span className="text-[12px] font-medium shrink-0" style={{ color: COLOR }}>⚡ Canon Rule:</span>
              <InlineText value={world.rules} onChange={(v) => updateWorld({ rules: v })}
                style={{ color: COLOR, fontSize: 12, fontWeight: 500 }} placeholder="Add a canon rule…" />
            </div>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{ cursor: "pointer", borderBottomColor: section === s.id ? COLOR : "transparent", color: section === s.id ? "var(--ink)" : "var(--ink-muted)" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {section === "overview" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label: "World Type", field: "type" as const },
            { label: "Canon Rule", field: "rules" as const },
          ].map(({ label, field }) => (
            <div key={field} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: COLOR }}>{label}</div>
              <InlineText value={world[field]} onChange={(v) => updateWorld({ [field]: v })}
                style={{ color: "var(--ink)", fontSize: 14 }} placeholder={`Add ${label.toLowerCase()}…`} />
            </div>
          ))}
          <div className="col-span-full p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: COLOR }}>World Overview</div>
            <InlineText value={world.overview} multiline onChange={(v) => updateWorld({ overview: v })}
              style={{ color: "var(--ink)", fontSize: 14, lineHeight: "1.7", display: "block" }} placeholder="Describe your world…" />
          </div>
        </div>
      )}

      {/* Geography */}
      {section === "geography" && (
        <div>
          <div className="p-4 rounded-xl mb-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase mb-2" style={{ color: COLOR }}>Geography Description</div>
            <InlineText value={world.geography} multiline onChange={(v) => updateWorld({ geography: v })}
              style={{ color: "var(--ink)", fontSize: 14, lineHeight: "1.7", display: "block" }} placeholder="Describe the geography…" />
          </div>
          <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Click the text above to edit. Separate locations with semicolons for list view.</p>
        </div>
      )}

      {/* Factions */}
      {section === "factions" && (
        <div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 mb-3">
            {factions.map((faction, i) => (
              <div key={i} className="p-4 rounded-xl group" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between mb-2">
                  <InlineText value={faction.name} onChange={(v) => updateFaction(i, { name: v })}
                    style={{ color: "var(--ink)", fontWeight: 700, fontSize: 14 }} placeholder="Faction name" />
                  <div className="flex items-center gap-2">
                    <InlineText value={faction.alignment} onChange={(v) => updateFaction(i, { alignment: v })}
                      style={{ color: COLOR, fontSize: 10, fontWeight: 700 }} placeholder="Alignment" />
                    <button onClick={() => removeFaction(i)} className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity"
                      style={{ color: "#ef4444", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
                <InlineText value={faction.description} multiline onChange={(v) => updateFaction(i, { description: v })}
                  style={{ color: "var(--ink-muted)", fontSize: 12, display: "block" }} placeholder="Describe this faction…" />
              </div>
            ))}
          </div>
          <button onClick={addFaction} className="w-full py-3 rounded-xl text-sm hover:opacity-80"
            style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)", cursor: "pointer" }}>
            + Add Faction
          </button>
        </div>
      )}

      {/* Timeline */}
      {section === "timeline" && (
        <div>
          <div className="flex flex-col gap-0 mb-3">
            {timeline.map((entry, i) => (
              <div key={i} className="flex gap-4 pb-5 group">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: COLOR }} />
                  {i < timeline.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />}
                </div>
                <div className="pb-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <InlineText value={entry.era} onChange={(v) => updateTimelineEntry(i, { era: v })}
                      style={{ color: COLOR, fontSize: 11, fontWeight: 700 }} placeholder="Era name" />
                    <button onClick={() => removeTimelineEntry(i)} className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity"
                      style={{ color: "#ef4444", cursor: "pointer" }}>✕</button>
                  </div>
                  <InlineText value={entry.event} multiline onChange={(v) => updateTimelineEntry(i, { event: v })}
                    style={{ color: "var(--ink)", fontSize: 14, display: "block" }} placeholder="What happened in this era?" />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addTimelineEntry} className="w-full py-3 rounded-xl text-sm hover:opacity-80"
            style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)", cursor: "pointer" }}>
            + Add Timeline Entry
          </button>
        </div>
      )}
    </div>
  );
}
