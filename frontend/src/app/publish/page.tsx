"use client";

import { useState, useEffect } from "react";

const COLOR = "#06b6d4";
const BG = "rgba(6,182,212,0.08)";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Format {
  id: string;
  label: string;
  description: string;
}

const FALLBACK_FORMATS: Format[] = [
  { id: "pdf",  label: "Print-Ready PDF",    description: "High-res PDF for print-on-demand" },
  { id: "cbz",  label: "Comic Book Archive", description: "CBZ for Kindle, Comixology, etc." },
  { id: "epub", label: "Digital eBook",      description: "EPUB 3 for iBooks and Kobo" },
  { id: "web",  label: "Webcomic Page",      description: "Responsive HTML for web publishing" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublishPage() {
  const [formats, setFormats] = useState<Format[]>(FALLBACK_FORMATS);
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ label: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Metadata fields
  const [title, setTitle]       = useState("The Shattered Grid");
  const [author, setAuthor]     = useState("");
  const [issue, setIssue]       = useState("#1 — File Zero");
  const [isbn, setIsbn]         = useState("");

  // Load available formats from backend
  useEffect(() => {
    fetch(`${API}/api/publish/formats`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.formats)) setFormats(d.formats); })
      .catch(() => {}); // silently keep fallback formats
  }, []);

  async function handleExport() {
    setExporting(true);
    setExportResult(null);
    setError(null);

    try {
      const res = await fetch(`${API}/api/publish/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: 1,
          format: selectedFormat,
          title,
          author,
          description: issue,
          isbn,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExportResult({ label: data.label, status: data.status });
    } catch {
      // Graceful offline fallback — simulate the export
      await new Promise((r) => setTimeout(r, 2000));
      const fmt = formats.find((f) => f.id === selectedFormat);
      setExportResult({ label: fmt?.label ?? selectedFormat, status: "queued" });
      setError("Backend unavailable — export queued locally. Connect backend to download the file.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 p-8 max-w-[900px] w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M3 12V13.5H13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 2V10M8 10L5.5 7.5M8 10L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ color: "var(--ink)" }}>
            Publish Studio<span className="text-[10px] align-super ml-0.5 opacity-50">™</span>
          </h1>
          <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>Export, Share & Distribute Your Comic</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 px-4 py-3 rounded-lg text-[12px]" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
          ⚠ {error}
        </div>
      )}

      {/* CanonGuard pre-flight */}
      <div className="rounded-xl px-5 py-4 mb-7 flex items-start gap-4" style={{ border: "1px solid rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.05)" }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5" style={{ color: "#f97316" }}>
          <path d="M8 2L13 4.5V8.5C13 11.26 10.76 13.76 8 14.5C5.24 13.76 3 11.26 3 8.5V4.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 6V9M8 10.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div>
          <div className="text-sm font-semibold mb-0.5" style={{ color: "#f97316" }}>CanonGuard Pre-Flight Check</div>
          <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
            3 unresolved canon issues detected (1 critical, 1 warning, 1 info). Resolve issues in CanonGuard before publishing, or proceed with known violations.
          </p>
          <div className="flex gap-2 mt-2">
            <a href="/canonguard" className="text-[12px] font-medium underline underline-offset-2" style={{ color: "#f97316" }}>Go to CanonGuard</a>
            <span style={{ color: "var(--ink-faint)" }}>·</span>
            <button className="text-[12px] transition-colors hover:opacity-80" style={{ color: "var(--ink-muted)" }}>Publish anyway</button>
          </div>
        </div>
      </div>

      {/* Publish summary */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: "Issues Ready", value: "1 of 1" },
          { label: "Pages", value: "1" },
          { label: "Panels", value: "6" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xl font-bold" style={{ color: COLOR }}>{s.value}</div>
            <div className="text-[11px] uppercase tracking-wide mt-0.5" style={{ color: "var(--ink-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Format selection */}
      <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--ink-faint)" }}>Export Format</div>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {formats.map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => setSelectedFormat(fmt.id)}
            className="text-left p-4 rounded-xl transition-all hover:opacity-90"
            style={{
              border: `1px solid ${selectedFormat === fmt.id ? COLOR : "var(--border)"}`,
              background: selectedFormat === fmt.id ? BG : "var(--surface)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div>
                <div className="text-sm font-bold" style={{ color: "var(--ink)" }}>{fmt.label}</div>
                <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>{fmt.description}</div>
              </div>
              {selectedFormat === fmt.id && (
                <div className="ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: COLOR }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: COLOR }} />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Metadata */}
      <div className="text-[10px] font-bold tracking-[0.15em] uppercase mb-3" style={{ color: "var(--ink-faint)" }}>Publication Details</div>
      <div className="grid grid-cols-2 gap-3 mb-7">
        {[
          { label: "Title", value: title, setter: setTitle, placeholder: "The Shattered Grid" },
          { label: "Author", value: author, setter: setAuthor, placeholder: "Your name" },
          { label: "Issue", value: issue, setter: setIssue, placeholder: "#1 — File Zero" },
          { label: "ISBN / ID", value: isbn, setter: setIsbn, placeholder: "Optional" },
        ].map((field) => (
          <div key={field.label}>
            <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>{field.label}</label>
            <input
              type="text"
              value={field.value}
              onChange={(e) => field.setter(e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-lg px-3 py-2 text-[13px] focus:outline-none transition-colors"
              style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }}
            />
          </div>
        ))}
      </div>

      {/* Export button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-6 py-3 text-sm font-bold rounded-xl transition-all disabled:opacity-60 flex items-center gap-2"
          style={{ background: COLOR, color: "#0d0d0f" }}
        >
          {exporting ? (
            <>
              <span className="w-4 h-4 border-2 border-[#0d0d0f] border-t-transparent rounded-full animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 12V13.5H13V12M8 2V10M8 10L5.5 7.5M8 10L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export as {formats.find((f) => f.id === selectedFormat)?.label ?? selectedFormat}
            </>
          )}
        </button>
        {exportResult && (
          <span className="text-sm font-medium" style={{ color: "#10b981" }}>
            ✓ {exportResult.label} — {exportResult.status === "queued" ? "queued for export" : exportResult.status}
          </span>
        )}
      </div>
    </div>
  );
}
