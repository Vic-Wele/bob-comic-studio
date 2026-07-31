"use client";

import { useState, useEffect } from "react";
import { loadProject } from "@/lib/projectStore";

const COLOR = "#ef4444";
const BG = "rgba(239,68,68,0.08)";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Severity = "critical" | "warning" | "info";

interface Issue {
  id: number;
  severity: Severity;
  category: string;
  description: string;
  location: string;
  suggestion: string;
  resolved: boolean;
  checklist?: CheckItem[];
}

interface CheckItem {
  id: string;
  label: string;
  done: boolean;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)"  },
  warning:  { label: "Warning",  color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  info:     { label: "Info",     color: "#7a7a8c", bg: "rgba(122,122,140,0.12)" },
};

// Build context string from the active project store
function buildScanContent(): string {
  const p = loadProject();
  const parts: string[] = [];
  if (p.world) {
    parts.push(`WORLD: ${p.world.name}. ${p.world.overview}`);
    if (p.world.rules) parts.push(`CANON RULES: ${p.world.rules}`);
  }
  if (p.characters.length > 0) {
    p.characters.forEach((c) => {
      const traits = Array.isArray(c.personality) ? c.personality.join(", ") : c.personality;
      parts.push(`CHARACTER: ${c.name} (${c.role}) — ${c.backstory?.slice(0, 100)}. Traits: ${traits}. Arc: ${c.arc}`);
    });
  }
  if (p.plot) {
    parts.push(`PREMISE: ${p.plot.premise}`);
  }
  return parts.join("\n\n") || "No project data yet — run Create Everything in Bob Director first.";
}

// Build a resolve checklist based on the issue
function buildChecklist(issue: Issue): CheckItem[] {
  return [
    { id: "c1", label: `Re-read all scenes involving ${issue.category}: identify every reference to the flagged element`, done: false },
    { id: "c2", label: `Apply the fix: ${issue.suggestion}`, done: false },
    { id: "c3", label: `Check surrounding panels (±3) for any related inconsistencies`, done: false },
    { id: "c4", label: `Update CanonCore with the corrected version`, done: false },
    { id: "c5", label: `Confirm the fix doesn't introduce a new contradiction elsewhere`, done: false },
  ];
}

export default function CanonGuardPage() {
  const [issues,    setIssues]    = useState<Issue[]>([]);
  const [scanning,  setScanning]  = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<number | null>(null); // issue id being resolved
  const [aiComment, setAiComment] = useState<Record<number, string>>({});

  // On mount, build demo issues from active project context
  useEffect(() => {
    const p = loadProject();
    const charName  = p.characters[0]?.name  ?? "the protagonist";
    const worldName = p.world?.name           ?? "the world";
    const rule      = p.world?.rules          ?? "core world rules";

    setIssues([
      {
        id: 1, severity: "critical", category: "Character", resolved: false,
        description: `${charName}'s eye augmentation is described inconsistently across panels.`,
        location: "Act 1 Panel 4 / Act 3 Panel 12",
        suggestion: `Standardise ${charName}'s augmentation description throughout, or add a narrative reason for any change.`,
      },
      {
        id: 2, severity: "warning", category: "Timeline", resolved: false,
        description: `${worldName} is referenced with two different founding years in separate panels.`,
        location: "Act 2 Panel 8 / Act 2 Panel 19",
        suggestion: "Pick one year and use it consistently — the earlier reference takes precedence.",
      },
      {
        id: 3, severity: "info", category: "World", resolved: false,
        description: `A live transmission occurs in a location that violates: "${rule.slice(0, 80)}…"`,
        location: "Act 2 Panel 15",
        suggestion: "Replace the live transmission with a delayed physical recording delivered by a courier.",
      },
    ]);
  }, []);

  const unresolved = issues.filter((i) => !i.resolved);
  const critical   = unresolved.filter((i) => i.severity === "critical").length;
  const warnings   = unresolved.filter((i) => i.severity === "warning").length;

  // Open the AI resolve dialogue for an issue
  function openResolve(id: number) {
    setIssues((prev) => prev.map((i) =>
      i.id === id && !i.checklist ? { ...i, checklist: buildChecklist(i) } : i
    ));
    setResolving(id);
  }

  function toggleCheckItem(issueId: number, itemId: string) {
    setIssues((prev) => prev.map((i) =>
      i.id === issueId
        ? { ...i, checklist: i.checklist?.map((c) => c.id === itemId ? { ...c, done: !c.done } : c) }
        : i
    ));
  }

  function canMarkResolved(issue: Issue) {
    return issue.checklist?.every((c) => c.done) ?? false;
  }

  function markResolved(id: number) {
    setIssues((prev) => prev.map((i) => i.id === id ? { ...i, resolved: true } : i));
    setResolving(null);
    // Fire-and-forget to backend
    fetch(`${API}/api/canonguard/issues/${id}/resolve`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    }).catch(() => {});
  }

  async function runScan() {
    setScanning(true); setScanError(null);
    const content = buildScanContent();
    try {
      const res = await fetch(`${API}/api/canonguard/scan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: 1, scan_type: "full", content }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data.issues) && data.issues.length > 0) {
        const mapped: Issue[] = data.issues.map((iss: Omit<Issue, "id" | "resolved">, idx: number) => ({
          id: idx + 1, severity: (iss.severity ?? "info") as Severity,
          category: iss.category ?? "General", description: iss.description ?? "",
          location: iss.location ?? "", suggestion: iss.suggestion ?? "", resolved: false,
        }));
        setIssues(mapped);
      }
    } catch {
      setScanError("Backend offline — showing issues derived from your active project. Start `docker compose up -d` to enable live AI scanning.");
      await new Promise((r) => setTimeout(r, 1400));
    } finally { setScanning(false); }
  }

  const resolveIssue = issues.find((i) => i.id === resolving);

  return (
    <div className="flex flex-col flex-1 p-6 max-w-[900px] w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-7">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L13 4.5V8.5C13 11.26 10.76 13.76 8 14.5C5.24 13.76 3 11.26 3 8.5V4.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M5.5 8L7.5 10L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ color: "var(--ink)" }}>CanonGuard<span className="text-[10px] align-super ml-0.5 opacity-50">™</span></h1>
          <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>Continuity & Consistency Enforcement Engine</p>
        </div>
        <div className="ml-auto">
          <button onClick={runScan} disabled={scanning}
            className="px-4 py-2 text-sm font-bold rounded-lg transition-all disabled:opacity-60"
            style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
            {scanning ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Scanning…
              </span>
            ) : "Run Canon Scan"}
          </button>
        </div>
      </div>

      {scanError && (
        <div className="mb-5 px-4 py-3 rounded-lg text-[12px]" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
          ⚠ {scanError}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-7">
        {[
          { label: "Total Issues", value: unresolved.length, color: "var(--ink)" },
          { label: "Critical",     value: critical,          color: "#ef4444"     },
          { label: "Warnings",     value: warnings,          color: "#f97316"     },
          { label: "Resolved",     value: issues.filter((i) => i.resolved).length, color: "#10b981" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: "var(--ink-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--ink-faint)" }}>Detected Issues</div>

      <div className="flex flex-col gap-3">
        {issues.map((issue) => {
          const cfg = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.info;
          const isResolving = resolving === issue.id;
          return (
            <div key={issue.id} className="rounded-xl transition-all"
              style={{ background: issue.resolved ? "var(--panel)" : "var(--surface)", border: "1px solid var(--border)", opacity: issue.resolved ? 0.5 : 1 }}>

              {/* Issue row */}
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ color: cfg.color, background: cfg.bg }}>{cfg.label.toUpperCase()}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{issue.description}</span>
                      {issue.resolved && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>RESOLVED</span>
                      )}
                    </div>
                    <p className="text-[12px] leading-relaxed mb-2 italic" style={{ color: "var(--ink-muted)" }}>{issue.suggestion}</p>
                    <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                      <span>Category: <span style={{ color: "var(--ink-muted)" }}>{issue.category}</span></span>
                      <span>·</span>
                      <span>{issue.location}</span>
                    </div>
                  </div>
                </div>
                {!issue.resolved && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openResolve(issue.id)}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors"
                      style={{ border: `1px solid ${isResolving ? COLOR : "#10b981"}`, color: isResolving ? COLOR : "#10b981", cursor: "pointer" }}>
                      {isResolving ? "Resolving…" : "Resolve"}
                    </button>
                  </div>
                )}
              </div>

              {/* AI Resolve Dialogue — expands inline */}
              {isResolving && resolveIssue && (
                <div className="px-4 pb-4 pt-0">
                  <div className="rounded-xl p-4" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
                    {/* AI guidance header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,92,216,0.15)", color: "#7c5cd8" }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor" />
                        </svg>
                      </div>
                      <span className="text-[12px] font-bold" style={{ color: "#7c5cd8" }}>Bob Director — Resolve Checklist</span>
                    </div>

                    <p className="text-[12px] mb-4 leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                      Work through each step below before marking this issue as resolved. Every box must be checked.
                    </p>

                    {/* Checklist */}
                    <div className="flex flex-col gap-2 mb-4">
                      {resolveIssue.checklist?.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                          <div className="mt-0.5 shrink-0">
                            <input type="checkbox" checked={item.done}
                              onChange={() => toggleCheckItem(issue.id, item.id)}
                              className="w-4 h-4 rounded" style={{ accentColor: "#10b981", cursor: "pointer" }} />
                          </div>
                          <span className="text-[13px] leading-relaxed" style={{ color: item.done ? "var(--ink-faint)" : "var(--ink)", textDecoration: item.done ? "line-through" : "none" }}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Notes field */}
                    <div className="mb-4">
                      <label className="text-[11px] block mb-1 font-medium" style={{ color: "var(--ink-muted)" }}>
                        How did you fix it? (optional note)
                      </label>
                      <textarea
                        value={aiComment[issue.id] ?? ""}
                        onChange={(e) => setAiComment((prev) => ({ ...prev, [issue.id]: e.target.value }))}
                        rows={2} placeholder="Describe what change you made…"
                        className="w-full rounded-lg px-3 py-2 text-[12px] resize-none focus:outline-none"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => markResolved(issue.id)}
                        disabled={!canMarkResolved(resolveIssue)}
                        className="px-4 py-2 text-[12px] font-bold rounded-lg transition-all disabled:opacity-40"
                        style={{ background: "#10b981", color: "#fff", cursor: canMarkResolved(resolveIssue) ? "pointer" : "default" }}>
                        ✓ Mark as Resolved
                      </button>
                      <button onClick={() => setResolving(null)}
                        className="px-4 py-2 text-[12px] rounded-lg"
                        style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
                        Cancel
                      </button>
                      <span className="text-[11px] ml-auto" style={{ color: "var(--ink-faint)" }}>
                        {resolveIssue.checklist?.filter((c) => c.done).length ?? 0} / {resolveIssue.checklist?.length ?? 0} steps complete
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
