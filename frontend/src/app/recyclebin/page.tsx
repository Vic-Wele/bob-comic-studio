"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  getRecycleBin,
  restoreProject,
  permanentlyDelete,
  emptyBin,
  loadProject,
  type DeletedProject,
} from "@/lib/projectStore";

const COLOR = "#ef4444";
const BG    = "rgba(239,68,68,0.08)";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Permanent delete confirm ──────────────────────────────────────────────
function PermanentDeleteModal({ entry, onConfirm, onCancel }: {
  entry: DeletedProject;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim() === entry.name.trim();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <div className="w-full max-w-[420px] rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.5)" }}
        onClick={(e) => e.stopPropagation()}>

        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4L14 4M5.5 4V2.5H10.5V4M4 4L4.5 13H11.5L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 7V10.5M9 7V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>Permanently delete</h2>
              <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>This cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl p-3 mb-4 text-[12px] leading-relaxed"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--ink-muted)" }}>
            <span className="font-bold" style={{ color: "var(--ink)" }}>{entry.name}</span> and all its data will be
            destroyed forever. Characters, world, plot, and chat history cannot be recovered.
          </div>

          <label className="block text-[12px] mb-2" style={{ color: "var(--ink-muted)" }}>
            Type <code className="px-1.5 py-0.5 rounded text-[11px] font-mono"
              style={{ background: "var(--panel)", color: "#ef4444" }}>{entry.name}</code> to confirm
          </label>
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && confirmed) onConfirm(); }}
            placeholder={entry.name}
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ background: "var(--panel)",
              border: `1px solid ${confirmed ? "#ef4444" : "var(--border)"}`,
              color: "var(--ink)", transition: "border-color 0.15s" }}
          />

          <div className="flex gap-2 mt-4">
            <button onClick={onConfirm} disabled={!confirmed}
              className="flex-1 py-2.5 text-[13px] font-bold rounded-xl disabled:opacity-30"
              style={{ background: "#ef4444", color: "#fff", cursor: confirmed ? "pointer" : "not-allowed" }}>
              Permanently delete
            </button>
            <button onClick={onCancel}
              className="px-4 py-2.5 text-[13px] font-medium rounded-xl"
              style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Restore conflict modal (active project exists) ────────────────────────
function RestoreConflictModal({ toRestore, activeProject, onConfirm, onCancel }: {
  toRestore: string;
  activeProject: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <div className="w-full max-w-[400px] rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid rgba(245,200,66,0.3)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>Overwrite active project?</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--ink-muted)" }}>
            You have an active project called <strong style={{ color: "var(--ink)" }}>{activeProject}</strong>.
            Restoring <strong style={{ color: "var(--ink)" }}>{toRestore}</strong> will overwrite it.
            <br /><br />
            The current project will be moved to the recycle bin first.
          </p>
          <div className="flex gap-2">
            <button onClick={onConfirm}
              className="flex-1 py-2.5 text-[13px] font-bold rounded-xl"
              style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}>
              Restore anyway
            </button>
            <button onClick={onCancel}
              className="px-4 py-2.5 text-[13px] font-medium rounded-xl"
              style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecycleBinPage() {
  const router = useRouter();
  const [bin, setBin]                   = useState<DeletedProject[]>([]);
  const [toast, setToast]               = useState<string | null>(null);
  const [permModal, setPermModal]       = useState<DeletedProject | null>(null);
  const [restoreConflict, setRestoreConflict] = useState<{ entry: DeletedProject; activeProject: string } | null>(null);

  // Read bin on mount
  useEffect(() => {
    setBin(getRecycleBin());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Restore ─────────────────────────────────────────────────────────────
  function handleRestore(entry: DeletedProject) {
    const active = loadProject();
    if (active.world?.name) {
      // There is an active project — warn before overwrite
      setRestoreConflict({ entry, activeProject: active.world.name });
    } else {
      doRestore(entry.id);
    }
  }

  function doRestore(id: string) {
    const name = restoreProject(id);
    setBin(getRecycleBin());
    setRestoreConflict(null);
    if (name) {
      showToast(`✓ "${name}" restored to active project`);
      setTimeout(() => router.push("/"), 1500);
    }
  }

  // ── Permanent delete ─────────────────────────────────────────────────────
  function handlePermanentDelete(entry: DeletedProject) {
    setPermModal(entry);
  }

  function confirmPermanentDelete() {
    if (!permModal) return;
    permanentlyDelete(permModal.id);
    setBin(getRecycleBin());
    showToast(`"${permModal.name}" permanently deleted`);
    setPermModal(null);
  }

  // ── Empty bin ────────────────────────────────────────────────────────────
  function handleEmptyBin() {
    if (!confirm(`Permanently destroy all ${bin.length} project(s) in the bin? This cannot be undone.`)) return;
    emptyBin();
    setBin([]);
    showToast("Recycle bin emptied");
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function countItems(entry: DeletedProject) {
    const chars   = entry.data.characters?.length ?? 0;
    const hasWorld = !!entry.data.world;
    const hasPlo  = !!entry.data.plot;
    const parts: string[] = [];
    if (chars)    parts.push(`${chars} character${chars > 1 ? "s" : ""}`);
    if (hasWorld) parts.push("world");
    if (hasPlo)   parts.push("plot");
    return parts.length ? parts.join(" · ") : "empty project";
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{ transform: "translateX(-50%)", background: "#10b981", color: "#fff",
            maxWidth: "calc(100vw - 32px)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {permModal && (
        <PermanentDeleteModal
          entry={permModal}
          onConfirm={confirmPermanentDelete}
          onCancel={() => setPermModal(null)}
        />
      )}
      {restoreConflict && (
        <RestoreConflictModal
          toRestore={restoreConflict.entry.name}
          activeProject={restoreConflict.activeProject}
          onConfirm={() => doRestore(restoreConflict.entry.id)}
          onCancel={() => setRestoreConflict(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 sm:py-5 shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: BG, color: COLOR }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M5.5 4V2.5H10.5V4M4 4L4.5 13H11.5L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 7V10.5M9 7V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold leading-tight" style={{ color: "var(--ink)" }}>
            Recycle Bin
          </h1>
          <p className="text-[11px] sm:text-[12px]" style={{ color: "var(--ink-muted)" }}>
            {bin.length === 0 ? "Empty" : `${bin.length} deleted project${bin.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Link href="/"
            className="px-3 py-1.5 text-[12px] font-medium rounded-lg"
            style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
            ← Dashboard
          </Link>
          {bin.length > 0 && (
            <button onClick={handleEmptyBin}
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg"
              style={{ background: BG, color: COLOR, border: `1px solid ${COLOR}40`, cursor: "pointer" }}>
              Empty bin
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-8 max-w-[800px] w-full mx-auto">

        {/* Empty state */}
        {bin.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none" style={{ color: "var(--ink-faint)" }}>
                <path d="M2 4H14M5.5 4V2.5H10.5V4M4 4L4.5 13H11.5L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-base font-bold mb-1" style={{ color: "var(--ink)" }}>Recycle bin is empty</h2>
            <p className="text-[13px] max-w-xs" style={{ color: "var(--ink-muted)" }}>
              When you delete a project from the dashboard, it lands here first — ready to restore or destroy.
            </p>
            <Link href="/" className="mt-6 px-4 py-2 text-sm font-bold rounded-lg"
              style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}>
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Bin items */}
        {bin.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Info banner */}
            <div className="rounded-xl p-3 mb-1 text-[12px] leading-relaxed"
              style={{ background: "rgba(245,200,66,0.05)", border: "1px solid rgba(245,200,66,0.2)", color: "var(--ink-muted)" }}>
              Projects here are <strong style={{ color: "var(--ink)" }}>not yet deleted</strong>.
              Restore to bring them back, or permanently delete to free up space.
              Restoring will make the project active across all modules.
            </div>

            {bin.map((entry) => (
              <div key={entry.id}
                className="rounded-xl p-4 sm:p-5 flex items-start gap-4 flex-wrap sm:flex-nowrap"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

                {/* Icon / avatar */}
                <div className="w-12 h-14 rounded-xl flex items-center justify-center text-xl font-black shrink-0"
                  style={{ background: BG, border: `1px solid ${COLOR}30`, color: COLOR }}>
                  {entry.name[0]?.toUpperCase() ?? "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{entry.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                      deleted
                    </span>
                  </div>
                  <div className="text-[12px] mb-1" style={{ color: "var(--ink-muted)" }}>
                    {countItems(entry)}
                  </div>
                  <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--ink-faint)" }}>
                    <span>Deleted {timeAgo(entry.deletedAt)}</span>
                    {entry.directorMessages && (
                      <span>· includes chat history</span>
                    )}
                  </div>

                  {/* Expandable snapshot preview */}
                  <details className="mt-3">
                    <summary className="text-[11px] cursor-pointer hover:opacity-70"
                      style={{ color: "var(--ink-faint)", listStyle: "none" }}>
                      <span className="underline underline-offset-2">View snapshot</span>
                    </summary>
                    <div className="mt-2 p-3 rounded-xl text-[11px] leading-relaxed"
                      style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink-muted)" }}>
                      {entry.data.world && (
                        <div className="mb-1.5">
                          <span className="font-bold" style={{ color: "var(--ink)" }}>World: </span>
                          {entry.data.world.name} — {entry.data.world.type}
                        </div>
                      )}
                      {entry.data.characters?.length > 0 && (
                        <div className="mb-1.5">
                          <span className="font-bold" style={{ color: "var(--ink)" }}>Characters: </span>
                          {entry.data.characters.map((c) => `${c.name} (${c.role})`).join(", ")}
                        </div>
                      )}
                      {entry.data.plot?.premise && (
                        <div>
                          <span className="font-bold" style={{ color: "var(--ink)" }}>Premise: </span>
                          {typeof entry.data.plot.premise === "string"
                            ? entry.data.plot.premise.slice(0, 180) + (entry.data.plot.premise.length > 180 ? "…" : "")
                            : ""}
                        </div>
                      )}
                    </div>
                  </details>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 flex-wrap sm:flex-col sm:items-end">
                  <button
                    onClick={() => handleRestore(entry)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-lg"
                    style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8C3 5.24 5.24 3 8 3C10.76 3 13 5.24 13 8C13 10.76 10.76 13 8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M3 3V7H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(entry)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold rounded-lg"
                    style={{ background: BG, color: COLOR, border: `1px solid ${COLOR}30`, cursor: "pointer" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L4.5 13H11.5L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 7V10.5M9 7V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Delete forever
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 sm:px-8 py-3 text-center text-[11px]" style={{ borderTop: "1px solid var(--border)", color: "var(--ink-faint)" }}>
        Projects in the bin are stored in your browser&apos;s localStorage and will persist across sessions.
      </div>
    </div>
  );
}
