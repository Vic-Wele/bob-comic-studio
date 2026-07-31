"use client";

import { useState, useEffect } from "react";
import { loadProject, type StoredCharacter, type StoredWorld } from "@/lib/projectStore";

const COLOR = "#7c5cd8";
const BG = "rgba(124,92,216,0.08)";

type TabId = "characters" | "worlds" | "lore" | "rules";

const TABS: { id: TabId; label: string }[] = [
  { id: "characters", label: "Characters" },
  { id: "worlds",     label: "Worlds"     },
  { id: "lore",       label: "Lore Entries" },
  { id: "rules",      label: "Canon Rules" },
];

// Static fallback lore entries (narrative demo data)
const STATIC_LORE = [
  { title: "The Cascade",        type: "Historical Event", summary: "Three simultaneous solar EMPs that destroyed the global network in 90 seconds — 2099." },
  { title: "File Zero",          type: "McGuffin",         summary: "Evidence of 10,000 unauthorised augmentation experiments hidden inside the Architect databanks." },
  { title: "The Runners",        type: "Faction",          summary: "Couriers and scouts of the free-zones — the only reliable carriers of physical data between nodes." },
  { title: "The Signal Protocol",type: "Technology",       summary: "Encrypted frequency used to send messages beyond the 500m wireless limit." },
  { title: "Node 7",             type: "Location",         summary: "The intended destination for File Zero — destroyed one month before Nova receives it." },
  { title: "The Barrens",        type: "Location",         summary: "Lawless free-zones between city-nodes. No power rationing, no law, no safety." },
  { title: "Augmentation Tech",  type: "Technology",       summary: "Neural and physical enhancement technology controlled exclusively by the Architects." },
];

function parseFactions(raw: string | { name: string; description: string; alignment: string }[]) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function parseTimeline(raw: string | { era: string; event: string }[]) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function buildRulesFromWorld(world: StoredWorld | null): string[] {
  const rules: string[] = [];
  if (!world) return rules;
  if (world.rules) rules.push(world.rules);
  const timeline = parseTimeline(world.timeline);
  if (timeline.length > 0) {
    rules.push(`Timeline anchored at: ${timeline[timeline.length - 1]?.era ?? "present"}`);
  }
  if (world.type) rules.push(`World genre: ${world.type}`);
  return rules;
}

export default function CanonCorePage() {
  const [activeTab, setActiveTab] = useState<TabId>("characters");
  const [characters, setCharacters] = useState<StoredCharacter[]>([]);
  const [world,      setWorld]      = useState<StoredWorld | null>(null);

  useEffect(() => {
    const stored = loadProject();
    setCharacters(stored.characters);
    setWorld(stored.world);
  }, []);

  const factions = world ? parseFactions(world.factions) : [];
  const rulesFromWorld = buildRulesFromWorld(world);

  // Merge world factions into lore entries
  const loreEntries = [
    ...STATIC_LORE,
    ...factions.map((f: { name: string; description: string; alignment: string }) => ({
      title: f.name,
      type: "Faction",
      summary: `${f.description} (${f.alignment})`,
    })),
  ];

  // Canon rules: world rules first, then hard narrative rules
  const hardRules = [
    "No character may possess knowledge they have not been shown receiving.",
    "A character's established abilities cannot be arbitrarily removed without narrative justification.",
    "Technology rules are absolute — any violation requires in-story explanation.",
  ];
  const allRules = [...rulesFromWorld, ...hardRules];

  // Stats derived from live project
  const hasProject = characters.length > 0 || world !== null;
  const worldCount = world ? 1 : 0;

  return (
    <div className="flex flex-col flex-1 p-8 max-w-[1000px] w-full mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <ellipse cx="8" cy="5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 5V11C3 12.38 5.24 13.5 8 13.5C10.76 13.5 13 12.38 13 11V5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 8C3 9.38 5.24 10.5 8 10.5C10.76 10.5 13 9.38 13 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: "var(--ink)" }}>
              CanonCore<span className="text-[10px] align-super ml-0.5 opacity-50">™</span>
            </h1>
            <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
              Universe Memory Layer · Shared by all modules
              {hasProject && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: BG, color: COLOR }}>LIVE</span>}
            </p>
          </div>
        </div>
        <button
          className="px-4 py-2 text-sm font-bold rounded-lg transition-colors"
          style={{ background: COLOR, color: "#fff", cursor: "pointer" }}
        >
          + Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[
          { label: "Characters",   value: characters.length > 0 ? String(characters.length)    : "0" },
          { label: "Worlds",       value: String(worldCount)                                         },
          { label: "Lore Entries", value: String(loreEntries.length)                                 },
          { label: "Canon Rules",  value: String(allRules.length)                                    },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xl font-bold" style={{ color: COLOR }}>{s.value}</div>
            <div className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: "var(--ink-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* No-project notice */}
      {!hasProject && (
        <div className="mb-6 px-4 py-3 rounded-xl text-[12px]" style={{ background: "rgba(124,92,216,0.08)", border: "1px solid rgba(124,92,216,0.2)", color: COLOR }}>
          No active project yet. Head to{" "}
          <a href="/director" className="font-bold underline underline-offset-2">Bob Director</a> and describe your story — CanonCore populates automatically when you hit ⚡ Create Everything.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              cursor: "pointer",
              borderBottomColor: activeTab === tab.id ? COLOR : "transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Characters tab */}
      {activeTab === "characters" && (
        <div className="flex flex-col gap-3">
          {characters.length > 0 ? characters.map((char, i) => {
            const traits = Array.isArray(char.personality)
              ? char.personality
              : (char.personality as string).split(",").map((s: string) => s.trim()).filter(Boolean);
            return (
              <div
                key={i}
                className="flex items-start gap-5 p-4 rounded-xl transition-all duration-150"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}
              >
                <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-lg font-bold border" style={{ background: BG, borderColor: COLOR, color: COLOR }}>
                  {char.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-bold" style={{ color: "var(--ink)" }}>{char.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: BG, color: COLOR }}>{char.role}</span>
                    {char.ai_generated && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,92,216,0.12)", color: "#7c5cd8" }}>AI</span>
                    )}
                    {char.arc && <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Arc: {char.arc.slice(0, 60)}{char.arc.length > 60 ? "…" : ""}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {traits.slice(0, 5).map((tag: string) => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink-muted)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="p-8 rounded-xl text-center" style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)" }}>
              <div className="text-2xl mb-2" style={{ color: COLOR }}>◉</div>
              <p className="text-sm">No characters yet. Generate them in CharacterForge or use ⚡ Create Everything in Bob Director.</p>
            </div>
          )}
          <button className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-colors hover:opacity-80" style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)", cursor: "pointer" }}>
            <span>+</span> Add Character to Canon
          </button>
        </div>
      )}

      {/* Worlds tab */}
      {activeTab === "worlds" && (
        world ? (
          <div className="flex flex-col gap-3">
            <div className="p-5 rounded-xl" style={{ background: "var(--surface)", border: `2px solid ${COLOR}` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-bold text-lg" style={{ color: "var(--ink)" }}>{world.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: BG, color: COLOR }}>{world.type}</span>
                {world.ai_generated && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,92,216,0.12)", color: "#7c5cd8" }}>AI GENERATED</span>
                )}
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--ink-muted)" }}>{world.overview}</p>
              {world.rules && (
                <p className="text-[12px] font-medium" style={{ color: COLOR }}>⚡ Canon Rule: {world.rules}</p>
              )}
            </div>
            {factions.length > 0 && (
              <div>
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-2 mt-2" style={{ color: "var(--ink-faint)" }}>Factions</div>
                <div className="grid grid-cols-2 gap-3">
                  {factions.map((f: { name: string; description: string; alignment: string }) => (
                    <div key={f.name} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ color: "var(--ink)" }}>{f.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: BG, color: COLOR }}>{f.alignment}</span>
                      </div>
                      <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 rounded-xl text-center" style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)" }}>
            <div className="text-2xl mb-2" style={{ color: COLOR }}>◎</div>
            <p className="text-sm">No worlds built yet. Use WorldForge to create your first world — it will be stored here automatically.</p>
          </div>
        )
      )}

      {/* Lore tab */}
      {activeTab === "lore" && (
        <div className="flex flex-col gap-3">
          {loreEntries.map((entry) => (
            <div key={entry.title} className="p-4 rounded-xl transition-colors" style={{ background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{entry.title}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: BG, color: COLOR }}>{entry.type}</span>
              </div>
              <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>{entry.summary}</p>
            </div>
          ))}
        </div>
      )}

      {/* Canon Rules tab */}
      {activeTab === "rules" && (
        <div className="flex flex-col gap-2">
          {allRules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <span className="text-[11px] font-bold mt-0.5 shrink-0" style={{ color: COLOR }}>
                RULE {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm" style={{ color: "var(--ink)" }}>{rule}</span>
            </div>
          ))}
          <button className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm hover:opacity-80" style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)", cursor: "pointer" }}>
            + Add Canon Rule
          </button>
        </div>
      )}
    </div>
  );
}
