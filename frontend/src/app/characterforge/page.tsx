"use client";

import { useState, useEffect } from "react";
import { loadProject, saveProject, type StoredCharacter } from "@/lib/projectStore";

const COLOR = "#e84393";
const BG = "rgba(232,67,147,0.08)";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Character extends StoredCharacter { id?: number }

const DEMO: Character[] = [
  { id: 1, name: "Nova Reyes", role: "Protagonist", age: "28", gender: "Female", occupation: "Whistleblower / Runner",
    personality: ["Methodical", "Principled", "Dry humour", "Trusts data over people"],
    appearance: "Late 20s, cropped dark hair with a silver streak, augmented left eye that glows amber. Always wears a worn leather jacket with hidden pockets.",
    backstory: "Former corporate data analyst who discovered her employer was secretly running human augmentation experiments. She stole the evidence and became a fugitive whistleblower overnight.",
    abilities: "Hacking, data analysis, photographic memory, basic combat training",
    arc: "Learns that justice sometimes requires breaking rules she once enforced, and that vulnerability is not weakness.", ai_generated: true },
  { id: 2, name: "Director Voss", role: "Antagonist", age: "54", gender: "Male", occupation: "Architect Director",
    personality: ["Coldly pragmatic", "Strategic", "Genuinely believes he saves humanity", "Privately warm"],
    appearance: "Mid-50s, silver buzz cut, always in Architect grey uniform. Mechanical right hand hidden under a glove.",
    backstory: "Architect of the augmentation programme. Genuinely believes he is saving humanity by accelerating forced evolution. Lost his entire family in the Collapse.",
    abilities: "Master strategist, Architect political connections, full Grid infrastructure access",
    arc: "Forces Nova — and the reader — to question whether his vision is entirely wrong.", ai_generated: true },
  { id: 3, name: "Cee (Cipher)", role: "Supporting", age: "13", gender: "Non-binary", occupation: "Runner",
    personality: ["Sarcastic", "Street-smart", "Deeply loyal", "Terrified of the dark"],
    appearance: "Early teens, wiry build, patchwork clothes covered in coded patches. Fingerless gloves, never without a worn satchel.",
    backstory: "Has been carrying messages between nodes for three years. Knows every secret route through the Barrens. Nobody taught them — they just figured it out.",
    abilities: "Parkour, dead reckoning navigation, lockpicking, reading people",
    arc: "Graduates from surviving to choosing — ultimately decides what kind of world to help build.", ai_generated: true },
];

function parsePersonality(value: string | string[]): string[] {
  if (Array.isArray(value)) return value;
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// Inline editable field
function EditableField({ label, value, multiline, onChange }: {
  label: string; value: string; multiline?: boolean;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  if (editing) {
    return (
      <div>
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1.5" style={{ color: "var(--ink-faint)" }}>{label}</div>
        {multiline ? (
          <textarea
            autoFocus rows={4}
            value={draft} onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ background: "var(--panel)", border: `1px solid ${COLOR}`, color: "var(--ink)" }}
          />
        ) : (
          <input autoFocus type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ background: "var(--panel)", border: `1px solid ${COLOR}`, color: "var(--ink)" }}
          />
        )}
        <div className="flex gap-2 mt-1.5">
          <button onClick={() => { onChange(draft); setEditing(false); }}
            className="px-3 py-1 text-[12px] font-bold rounded-lg"
            style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>Save</button>
          <button onClick={() => { setDraft(value); setEditing(false); }}
            className="px-3 py-1 text-[12px] rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>{label}</div>
        <button onClick={() => setEditing(true)} className="text-[11px] px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: COLOR, background: BG, cursor: "pointer" }}>Edit</button>
      </div>
      <p className="text-sm leading-relaxed rounded-xl p-3 cursor-text hover:opacity-80 transition-opacity"
        style={{ color: "var(--ink)", background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={() => setEditing(true)}>{value || <span style={{ color: "var(--ink-faint)" }}>Click to add…</span>}</p>
    </div>
  );
}

export default function CharacterForgePage() {
  const [characters, setCharacters] = useState<Character[]>(DEMO);
  const [selected, setSelected] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateRole, setGenerateRole] = useState("protagonist");
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const stored = loadProject();
    if (stored.characters.length > 0) { setCharacters(stored.characters as Character[]); return; }
    setLoading(true);
    fetch(`${API}/api/characters/1`).then((r) => r.json())
      .then((data: Character[]) => { if (Array.isArray(data) && data.length > 0) { setCharacters(data); saveProject({ characters: data as StoredCharacter[] }); } })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const char = characters[selected] ?? characters[0];

  function updateChar(changes: Partial<Character>) {
    const updated = characters.map((c, i) => i === selected ? { ...c, ...changes } : c);
    setCharacters(updated);
    saveProject({ characters: updated as StoredCharacter[] });
  }

  async function handleGenerate() {
    if (!generatePrompt.trim()) return;
    setGenerating(true); setError(null);
    try {
      const res = await fetch(`${API}/api/characters/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: 1, prompt: generatePrompt, role: generateRole }),
      });
      if (!res.ok) throw new Error();
      const newChar: Character = await res.json();
      const updated = [...characters, newChar];
      setCharacters(updated); saveProject({ characters: updated as StoredCharacter[] });
      setSelected(updated.length - 1); setGeneratePrompt(""); setShowGenerateForm(false);
    } catch {
      // Offline fallback — create a character from the prompt
      const words = generatePrompt.split(" ");
      const name = words.find((w) => w.length > 3 && /^[A-Z]/.test(w)) ?? words[0];
      const newChar: Character = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        role: generateRole, backstory: generatePrompt,
        personality: ["Complex", "Driven", "Conflicted"],
        appearance: "Visual design to be developed with the artist.",
        abilities: "Abilities defined by their role and backstory.",
        arc: "Begins defined by their past; ends choosing their future.",
        ai_generated: true,
      };
      const updated = [...characters, newChar];
      setCharacters(updated); saveProject({ characters: updated as StoredCharacter[] });
      setSelected(updated.length - 1); setGeneratePrompt(""); setShowGenerateForm(false);
      setError("Backend offline — character created from your prompt. Edit any field to refine.");
    } finally { setGenerating(false); }
  }

  async function handleGeneratePortrait() {
    setPortraitLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    const seed = encodeURIComponent((char.name + char.appearance).slice(0, 40));
    updateChar({ appearance: char.appearance }); // trigger save
    // Show picsum placeholder — real image model would go here
    alert(`Portrait generation queued for ${char.name}.\n\nIn production this calls an image generation API (Stable Diffusion / DALL·E) with:\n"${char.appearance?.slice(0, 120)}"`);
    setPortraitLoading(false);
    void seed;
  }

  function deleteChar(idx: number) {
    if (!confirm(`Remove ${characters[idx].name}?`)) return;
    const updated = characters.filter((_, i) => i !== idx);
    setCharacters(updated); saveProject({ characters: updated as StoredCharacter[] });
    setSelected(Math.max(0, idx - 1));
  }

  const traits = char ? parsePersonality(char.personality) : [];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 14C2 11.24 4.69 9 8 9C11.31 9 14 11.24 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold leading-tight" style={{ color: "var(--ink)" }}>CharacterForge<span className="text-[10px] align-super ml-0.5 opacity-50">™</span></h1>
          <p className="text-[11px] sm:text-[12px] hidden sm:block" style={{ color: "var(--ink-muted)" }}>Character Design & Canon Builder</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowGenerateForm((v) => !v)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-bold rounded-lg transition-all hover:opacity-85"
            style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
            + New Character
          </button>
        </div>
      </div>

      {/* Generate form */}
      {showGenerateForm && (
        <div className="px-6 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="max-w-[700px] flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Character prompt</label>
              <input type="text" value={generatePrompt} onChange={(e) => setGeneratePrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="e.g. A disgraced engineer who secretly built the weapon that destroyed her city"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }} />
            </div>
            <div>
              <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Role</label>
              <select value={generateRole} onChange={(e) => setGenerateRole(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)", cursor: "pointer" }}>
                {["protagonist", "antagonist", "supporting", "mentor", "trickster"].map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <button onClick={handleGenerate} disabled={!generatePrompt.trim() || generating}
              className="px-4 py-2 text-sm font-bold rounded-lg disabled:opacity-40"
              style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
              {generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</span> : "Generate"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px]" style={{ color: "#f97316" }}>⚠ {error}</p>}
        </div>
      )}

      {/* Character list + detail stack vertically on mobile */}
      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {/* Character list — horizontal scroll on mobile, fixed column on desktop */}
        <div className="sm:w-[200px] shrink-0 sm:overflow-y-auto overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              {loading ? "Loading…" : `Cast · ${characters.length}`}
            </div>
          </div>
          {/* On mobile: horizontal pill row. On desktop: vertical list */}
          <div className="p-2 flex sm:flex-col gap-1.5 sm:gap-1 overflow-x-auto sm:overflow-visible">
            {characters.map((c, i) => (
              <button key={i} onClick={() => setSelected(i)}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl text-left transition-all group shrink-0 sm:shrink sm:w-full"
                style={{ background: selected === i ? "var(--panel)" : "transparent", border: `1px solid ${selected === i ? "var(--border)" : "transparent"}`, cursor: "pointer" }}>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: BG, color: COLOR, border: `1px solid ${COLOR}` }}>{c.name[0]}</div>
                <div className="min-w-0">
                  <div className="text-[12px] sm:text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>{c.name}</div>
                  <div className="text-[10px] sm:text-[11px] capitalize hidden sm:block" style={{ color: "var(--ink-muted)" }}>{c.role}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteChar(i); }}
                  className="opacity-0 group-hover:opacity-100 text-[10px] px-1 rounded transition-opacity ml-auto"
                  style={{ color: "#ef4444", cursor: "pointer" }}>✕</button>
              </button>
            ))}
            <button onClick={() => setShowGenerateForm(true)}
              className="flex items-center justify-center gap-1 py-2 px-3 mt-0 sm:mt-1 rounded-xl text-[11px] sm:text-[12px] transition-colors hover:opacity-80 shrink-0 sm:shrink"
              style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)", cursor: "pointer" }}>
              + Add
            </button>
          </div>
        </div>

        {/* Character detail */}
        {char && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="max-w-[720px] group">
              {/* Header */}
              <div className="flex items-start gap-5 mb-7">
                <div className="w-20 h-24 rounded-xl flex items-center justify-center text-3xl font-bold border-2 shrink-0"
                  style={{ background: BG, borderColor: COLOR, color: COLOR }}>{char.name[0]}</div>
                <div className="flex-1 min-w-0">
                  {/* Editable name */}
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <input value={char.name} onChange={(e) => updateChar({ name: e.target.value })}
                      className="text-2xl font-bold bg-transparent focus:outline-none border-b border-transparent focus:border-current"
                      style={{ color: "var(--ink)", cursor: "text" }} />
                    {char.ai_generated && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,92,216,0.12)", color: "#7c5cd8" }}>AI GENERATED</span>}
                  </div>
                  {/* Inline meta fields */}
                  <div className="flex gap-2 flex-wrap text-[12px] mb-3">
                    {[
                      { label: "Role", field: "role" as const, val: char.role },
                      { label: "Age", field: "age" as const, val: char.age ?? "" },
                      { label: "Gender", field: "gender" as const, val: char.gender ?? "" },
                      { label: "Occupation", field: "occupation" as const, val: char.occupation ?? "" },
                    ].map(({ label, field, val }) => (
                      <div key={field} className="flex items-center gap-1">
                        <span style={{ color: "var(--ink-faint)" }}>{label}:</span>
                        <input value={val} onChange={(e) => updateChar({ [field]: e.target.value })}
                          placeholder={label}
                          className="bg-transparent border-b border-dashed focus:outline-none text-[12px] w-24"
                          style={{ color: "var(--ink-muted)", borderColor: "var(--border)", cursor: "text" }} />
                      </div>
                    ))}
                  </div>
                  {/* Personality traits */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {traits.map((trait, ti) => (
                      <span key={ti} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border" style={{ borderColor: COLOR, color: COLOR, background: BG }}>
                        {trait}
                        <button onClick={() => { const t = traits.filter((_, i) => i !== ti); updateChar({ personality: t }); }} style={{ cursor: "pointer", color: COLOR, marginLeft: 2 }}>×</button>
                      </span>
                    ))}
                    <button onClick={() => { const t = prompt("Add trait:"); if (t?.trim()) updateChar({ personality: [...traits, t.trim()] }); }}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-dashed"
                      style={{ borderColor: COLOR, color: COLOR, cursor: "pointer" }}>+ trait</button>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button onClick={handleGeneratePortrait} disabled={portraitLoading}
                    className="px-3 py-1.5 text-[12px] font-bold rounded-lg disabled:opacity-50"
                    style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
                    {portraitLoading ? "Generating…" : "Generate Portrait"}
                  </button>
                </div>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <EditableField label="Appearance" value={char.appearance} multiline onChange={(v) => updateChar({ appearance: v })} />
                <EditableField label="Character Arc" value={char.arc} multiline onChange={(v) => updateChar({ arc: v })} />
                <EditableField label="Abilities" value={char.abilities ?? ""} multiline onChange={(v) => updateChar({ abilities: v })} />
                <div className="md:col-span-2">
                  <EditableField label="Backstory" value={char.backstory} multiline onChange={(v) => updateChar({ backstory: v })} />
                </div>
              </div>

              {/* AI Actions */}
              <div className="mt-6 p-4 rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--ink-faint)" }}>AI Actions</div>
                <div className="flex gap-2 flex-wrap">
                  {["Expand Backstory", "Generate Dialogue Sample", "Find Contradictions", "Generate Reference Sheet", "Add to CanonCore"].map((action) => (
                    <button key={action}
                      onClick={() => alert(`"${action}" will call the AI backend when connected.\n\nCurrently offline — check docker compose up -d`)}
                      className="px-3 py-1.5 text-[12px] rounded-lg transition-colors hover:opacity-80"
                      style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", background: "var(--panel)", cursor: "pointer" }}>
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
