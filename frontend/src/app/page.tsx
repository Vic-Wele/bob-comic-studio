"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { loadProject, saveProject, deleteProject, getRecycleBin } from "@/lib/projectStore";

// ── Comic covers using Open Library cover_i IDs ───────────────────────────
// Format: https://covers.openlibrary.org/b/id/{cover_i}-M.jpg
// These are verified numeric cover IDs from Open Library works/editions.
const POPULAR_COMICS = [
  { id: "watchmen",     title: "Watchmen",            year: "1987", genre: "Superhero / Drama",     color: "#f5c842", olid: "240741",
    style: "Dense 9-panel grids, stark primary colors, symmetrical layouts. Morally grey superheroes, cold blue night tones, yellow smiley-face motif.",
    author: "Alan Moore & Dave Gibbons" },
  { id: "akira",        title: "Akira Vol. 1",         year: "1984", genre: "Cyberpunk / Sci-Fi",    color: "#3b82f6", olid: "14903645",
    style: "Hyper-detailed cityscapes, speed-line action panels, neon blues and reds against black. Massive scale contrast between tiny figures and colossal environments.",
    author: "Katsuhiro Otomo" },
  { id: "maus",         title: "Maus",                 year: "1986", genre: "Historical / Drama",    color: "#ef4444", olid: "347850",
    style: "Stark black-and-white only, scratchy crosshatching, anthropomorphic animal characters. Minimal backgrounds, raw emotional close-ups.",
    author: "Art Spiegelman" },
  { id: "sandman",      title: "The Sandman Vol. 1",   year: "1991", genre: "Fantasy / Horror",      color: "#7c5cd8", olid: "14889186",
    style: "Rich painterly covers, flowing organic panel borders, dreamlike surrealism. Deep purples and blacks, intricate decorative typography.",
    author: "Neil Gaiman" },
  { id: "persepolis",   title: "Persepolis",           year: "2000", genre: "Autobiography",         color: "#10b981", olid: "8479576",
    style: "High-contrast black-and-white silhouettes, bold graphic shapes, minimal detail. Persian decorative border motifs, expressive flat figures.",
    author: "Marjane Satrapi" },
  { id: "saga",         title: "Saga Vol. 1",          year: "2012", genre: "Sci-Fi / Fantasy",      color: "#f97316", olid: "12072458",
    style: "Watercolor-painted pages, lush alien environments in warm earth tones. Unconventional page layouts, intimate domestic scenes alongside epic sci-fi vistas.",
    author: "Brian K. Vaughan & Fiona Staples" },
  { id: "vfv",          title: "V for Vendetta",       year: "1988", genre: "Dystopian / Political",  color: "#e84393", olid: "233549",
    style: "Atmospheric purple and shadow palettes. Tight noir compositions, heavy use of silhouette, typographic panel captions over rain-soaked cityscapes.",
    author: "Alan Moore & David Lloyd" },
  { id: "dredd",        title: "Judge Dredd",          year: "1977", genre: "Sci-Fi / Action",        color: "#06b6d4", olid: "6988440",
    style: "Bold primary colours, exaggerated anatomy, satirical future-city mega-panels. High contrast inking, action-packed sequential storytelling.",
    author: "John Wagner & Carlos Ezquerra" },
];

interface ComicSearchResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
}

// Comic inspection modal data — works for both featured strip and search results
interface ModalComic {
  title: string;
  author: string;
  year: string | number;
  genre?: string;
  color: string;
  coverId: number | string; // olid string OR cover_i number
  coverType: "olid" | "id";
  style?: string;
  subjects?: string[];
}

const modules = [
  { id: "director",   label: "Bob Director",    href: "/director",       color: "#f5c842", bg: "rgba(245,200,66,0.06)",
    description: "Your AI creative co-pilot. Describe your vision and Bob orchestrates every module to bring it to life.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor" /></svg> },
  { id: "canoncore",  label: "CanonCore",        href: "/canoncore",      color: "#7c5cd8", bg: "rgba(124,92,216,0.06)",
    description: "Persistent memory for your universe. Characters, lore, and world rules stored and enforced across every issue.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 5V11C3 12.38 5.24 13.5 8 13.5C10.76 13.5 13 12.38 13 11V5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 8C3 9.38 5.24 10.5 8 10.5C10.76 10.5 13 9.38 13 8" stroke="currentColor" strokeWidth="1.5" /></svg> },
  { id: "creator",    label: "Creator Mode",     href: "/creator",        color: "#3b82f6", bg: "rgba(59,130,246,0.06)",
    description: "The full-canvas panel editor. Arrange layouts, add dialogue, and fine-tune every frame of your story.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /><rect x="8.5" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /></svg> },
  { id: "charforge",  label: "CharacterForge",   href: "/characterforge", color: "#e84393", bg: "rgba(232,67,147,0.06)",
    description: "Design every character with AI-generated profiles, personality maps, visual references, and arc tracking.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M2 14C2 11.24 4.69 9 8 9C11.31 9 14 11.24 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
  { id: "worldforge", label: "WorldForge",        href: "/worldforge",    color: "#10b981", bg: "rgba(16,185,129,0.06)",
    description: "Build your world's geography, factions, history, and rules. Give your story a living, breathing backdrop.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M2 8H14M8 2C6.5 4.5 6.5 11.5 8 14M8 2C9.5 4.5 9.5 11.5 8 14" stroke="currentColor" strokeWidth="1.5" /></svg> },
  { id: "plotsmith",  label: "PlotSmith",          href: "/plotsmith",    color: "#f97316", bg: "rgba(249,115,22,0.06)",
    description: "Turn a premise into a full script. AI breaks your story into arcs, issues, scenes, and panel-by-panel breakdowns.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M3 8H10M3 12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
  { id: "canonguard", label: "CanonGuard",         href: "/canonguard",   color: "#ef4444", bg: "rgba(239,68,68,0.06)",
    description: "Consistency enforcement engine. Scans your comic for contradictions, continuity errors, and lore violations.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 4.5V8.5C13 11.26 10.76 13.76 8 14.5C5.24 13.76 3 11.26 3 8.5V4.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M5.5 8L7.5 10L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { id: "publish",    label: "Publish Studio",     href: "/publish",      color: "#06b6d4", bg: "rgba(6,182,212,0.06)",
    description: "Export your finished comic as PDF, CBZ, web reader, or print-ready files. One click to share with the world.", status: "Active",
    icon: <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M3 12V13.5H13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M8 2V10M8 10L5.5 7.5M8 10L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
];

// ── Comic Inspection Modal ─────────────────────────────────────────────────
function ComicModal({ comic, onClose }: { comic: ModalComic; onClose: () => void }) {
  const router = useRouter();
  const [applied, setApplied] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const coverSrc = comic.coverType === "olid"
    ? `https://covers.openlibrary.org/b/id/${comic.coverId}-L.jpg`
    : `https://covers.openlibrary.org/b/id/${comic.coverId}-L.jpg`;

  function applyAndGoToCreator() {
    // Save style note to project store so Director can use it
    const stored = loadProject();
    const styleNote = `Style ref: "${comic.title}" (${comic.year}) by ${comic.author}`;
    if (stored.world) {
      saveProject({ ...stored, world: { ...stored.world, rules: stored.world.rules ? `${stored.world.rules} | ${styleNote}` : styleNote } });
    }
    setApplied(true);
    setTimeout(() => { onClose(); router.push("/creator"); }, 700);
  }

  // Close on backdrop click or Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[540px] rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: `1px solid ${comic.color}40`, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: "var(--panel)", color: "var(--ink-muted)", cursor: "pointer", border: "1px solid var(--border)" }}>
          ✕
        </button>

        {/* Cover image — full width */}
        <div className="w-full flex items-center justify-center" style={{ background: "#0d0d0f", minHeight: 220, maxHeight: 320, overflow: "hidden" }}>
          {!imgErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt={comic.title}
              className="w-full object-cover"
              style={{ maxHeight: 320, objectPosition: "top" }}
              onError={() => setImgErr(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 w-full"
              style={{ background: `linear-gradient(160deg, #1a1a1f 0%, ${comic.color}22 100%)` }}>
              <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-3xl font-black"
                style={{ borderColor: comic.color, color: comic.color, background: `${comic.color}15` }}>
                {comic.title[0]}
              </div>
              <div className="text-sm font-bold" style={{ color: comic.color }}>{comic.title}</div>
            </div>
          )}
        </div>

        {/* Info body */}
        <div className="p-5">
          {/* Title + meta */}
          <div className="mb-1">
            <div className="flex items-start gap-2 flex-wrap">
              <h2 className="text-lg font-bold leading-tight" style={{ color: "var(--ink)" }}>{comic.title}</h2>
              {comic.genre && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 shrink-0"
                  style={{ background: `${comic.color}18`, color: comic.color, border: `1px solid ${comic.color}30` }}>
                  {comic.genre}
                </span>
              )}
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
              {comic.author} · {comic.year}
            </div>
          </div>

          {/* Style description */}
          {comic.style && (
            <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--panel)", border: "1px solid var(--border)" }}>
              <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--ink-faint)" }}>Visual Style</div>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>{comic.style}</p>
            </div>
          )}

          {/* Subject tags from search results */}
          {comic.subjects && comic.subjects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {comic.subjects.slice(0, 6).map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${comic.color}12`, color: comic.color, border: `1px solid ${comic.color}25` }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="my-4" style={{ borderTop: "1px solid var(--border)" }} />

          {/* CTA */}
          <div className="flex flex-col gap-2">
            <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
              Apply this comic&apos;s visual style as a reference and jump straight into Creator Mode.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={applyAndGoToCreator}
                disabled={applied}
                className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-xl disabled:opacity-60 transition-all"
                style={{ background: comic.color, color: "#0d0d0f", cursor: "pointer" }}>
                {applied
                  ? <><span className="w-3.5 h-3.5 border-2 border-[#0d0d0f] border-t-transparent rounded-full animate-spin" />Opening Creator…</>
                  : <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><rect x="8.5" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                    Send to Creator Mode
                  </>
                }
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 text-[13px] font-medium rounded-xl"
                style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──────────────────────────────────────────────
function DeleteModal({ projectName, onConfirm, onCancel }: {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmed = typed.trim() === projectName.trim();

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <div className="w-full max-w-[440px] rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.35)" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Red header bar */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4H13M6 4V2H10V4M5 4V13H11V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--ink)" }}>Delete project</h2>
              <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>This action moves all data to the recycle bin</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Info box */}
          <div className="rounded-xl p-3 mb-4 text-[12px] leading-relaxed"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--ink-muted)" }}>
            Deleting <span className="font-bold" style={{ color: "var(--ink)" }}>{projectName}</span> will remove all
            characters, world data, plot structure, creator panels, and chat history.
            <br /><br />
            You can recover it from the <strong>Recycle Bin</strong> before permanently destroying it.
          </div>

          {/* Confirmation input */}
          <label className="block text-[12px] mb-2" style={{ color: "var(--ink-muted)" }}>
            Type <code className="px-1.5 py-0.5 rounded text-[12px] font-mono"
              style={{ background: "var(--panel)", color: "#ef4444" }}>{projectName}</code> to confirm
          </label>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && confirmed) onConfirm(); }}
            placeholder={projectName}
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ background: "var(--panel)", border: `1px solid ${confirmed ? "#ef4444" : "var(--border)"}`,
              color: "var(--ink)", transition: "border-color 0.15s" }}
          />

          {/* Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onConfirm}
              disabled={!confirmed}
              className="flex-1 py-2.5 text-[13px] font-bold rounded-xl disabled:opacity-30 transition-all"
              style={{ background: "#ef4444", color: "#fff", cursor: confirmed ? "pointer" : "not-allowed" }}>
              Delete &amp; move to bin
            </button>
            <button
              onClick={onCancel}
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

export default function DashboardPage() {
  const router = useRouter();
  const [projectName,   setProjectName]   = useState("");
  const [hasProject,    setHasProject]    = useState(false);
  const [binCount,      setBinCount]      = useState(0);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Comic modal state
  const [modalComic, setModalComic] = useState<ModalComic | null>(null);

  // Comic search state
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState<ComicSearchResult[]>([]);
  const [searching,      setSearching]      = useState(false);
  const [searchError,    setSearchError]    = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<ComicSearchResult | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cover image load error tracking
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored = loadProject();
    if (stored.world?.name) { setProjectName(stored.world.name); setHasProject(true); }
    else setHasProject(false);
    setBinCount(getRecycleBin().length);
  }, []);

  function handleDeleteConfirmed() {
    deleteProject();
    setHasProject(false);
    setProjectName("");
    setBinCount((n) => n + 1);
    setShowDeleteModal(false);
    router.refresh();
  }

  // Debounced Open Library search — restrict to comics/graphic novels
  function handleSearchInput(q: string) {
    setSearchQuery(q);
    setSearchResults([]);
    setSelectedResult(null);
    setSearchError(null);
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!q.trim() || q.length < 3) return;
    searchRef.current = setTimeout(() => doSearch(q), 500);
  }

  async function doSearch(q: string) {
    setSearching(true);
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&subject=comics&fields=key,title,author_name,cover_i,first_publish_year,subject&limit=10`;
      const res  = await fetch(url);
      const data = await res.json();
      const docs: ComicSearchResult[] = (data.docs ?? []).filter((d: ComicSearchResult) => d.cover_i);
      setSearchResults(docs.slice(0, 6));
      if (docs.length === 0) setSearchError("No comic results found. Try a different title.");
    } catch {
      setSearchError("Search unavailable — check your internet connection.");
    } finally {
      setSearching(false);
    }
  }

  function openSearchResultModal(result: ComicSearchResult) {
    setModalComic({
      title: result.title,
      author: result.author_name?.[0] ?? "Unknown",
      year: result.first_publish_year ?? "",
      color: "#f5c842",
      coverId: result.cover_i!,
      coverType: "id",
      subjects: result.subject,
    });
    setSearchResults([]);
    setSearchQuery("");
    setSelectedResult(null);
  }

  function openFeaturedModal(comic: typeof POPULAR_COMICS[0]) {
    setModalComic({
      title: comic.title,
      author: comic.author,
      year: comic.year,
      genre: comic.genre,
      color: comic.color,
      coverId: comic.olid,
      coverType: "olid",
      style: comic.style,
    });
  }

  return (
    <>
      {/* Comic inspection modal */}
      {modalComic && <ComicModal comic={modalComic} onClose={() => setModalComic(null)} />}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteModal
          projectName={projectName}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <div className="flex flex-col flex-1 p-4 sm:p-6 max-w-[1100px] w-full mx-auto">

        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-px h-8" style={{ background: "#f5c842" }} />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "var(--ink-muted)" }}>
              IBM AI Builders Challenge · July 2025
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-2" style={{ color: "var(--ink)" }}>
            Bob Comic Studio
          </h1>
          <p className="text-sm sm:text-base max-w-xl" style={{ color: "var(--ink-muted)" }}>
            The AI Operating System for Visual Storytelling. Eight specialised agents, one shared memory, infinite stories.
          </p>
          <div className="mt-4 sm:mt-5 flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link href="/director" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg hover:opacity-90"
              style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor" /></svg>
              Start Creating
            </Link>
            <Link href="/plotsmith" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-80"
              style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
              New Story
            </Link>
            {hasProject && (
              <Link href="/director" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-80"
                style={{ border: "1px solid #f5c842", color: "#f5c842", cursor: "pointer" }}>
                Continue: {projectName}
              </Link>
            )}
          </div>
        </div>

        {/* ── Comic Search Bar ───────────────────────────────────────────────── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Style Search — Find a Comic, Inspect &amp; Apply
            </h2>
          </div>
          <div className="relative max-w-[560px]">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--ink-faint)", flexShrink: 0 }}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                type="text" value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search comics… e.g. Saga, V for Vendetta, Fun Home"
                className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
                style={{ color: "var(--ink)" }}
              />
              {searching && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" style={{ color: "var(--ink-faint)" }} />}
              {searchQuery && !searching && (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); setSelectedResult(null); setSearchError(null); }}
                  className="text-[12px] shrink-0" style={{ color: "var(--ink-faint)", cursor: "pointer" }}>✕</button>
              )}
            </div>

            {/* Search results dropdown */}
            {(searchResults.length > 0 || searchError) && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 overflow-hidden"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                {searchError && (
                  <div className="px-4 py-3 text-[12px]" style={{ color: "var(--ink-muted)" }}>{searchError}</div>
                )}
                {searchResults.map((result) => (
                  <button key={result.key} onClick={() => openSearchResultModal(result)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                    {result.cover_i && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`https://covers.openlibrary.org/b/id/${result.cover_i}-S.jpg`}
                        alt={result.title} className="w-8 h-10 object-cover rounded shrink-0"
                        style={{ border: "1px solid var(--border)" }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>{result.title}</div>
                      <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                        {result.author_name?.[0] ?? "Unknown"} · {result.first_publish_year ?? ""}
                      </div>
                    </div>
                    <span className="text-[11px] ml-auto shrink-0 font-medium" style={{ color: "#f5c842" }}>Inspect →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Landmark Comics covers strip ───────────────────────────────────── */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Inspiration — Landmark Comics
            </h2>
            <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>Tap to inspect</span>
          </div>

          {/* Covers row — horizontal scroll on all sizes */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {POPULAR_COMICS.map((comic) => {
              const hasErr = imgErrors[comic.id];
              return (
                <button key={comic.id}
                  onClick={() => openFeaturedModal(comic)}
                  className="shrink-0 rounded-xl overflow-hidden transition-all hover:scale-105 focus:outline-none"
                  style={{ width: 90, height: 130, cursor: "pointer",
                    outline: `2px solid transparent`, outlineOffset: 2 }}
                  title={`${comic.title} — click to inspect`}>
                  {!hasErr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://covers.openlibrary.org/b/id/${comic.olid}-M.jpg`}
                      alt={comic.title}
                      className="w-full h-full object-cover"
                      onError={() => setImgErrors((prev) => ({ ...prev, [comic.id]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between p-2"
                      style={{ background: `linear-gradient(160deg, #1a1a1f 0%, ${comic.color}22 100%)`, border: `1px solid ${comic.color}40` }}>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-base font-black"
                          style={{ borderColor: comic.color, color: comic.color, background: `${comic.color}15` }}>
                          {comic.title[0]}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold leading-tight" style={{ color: comic.color }}>{comic.title}</div>
                        <div className="text-[8px] mt-0.5" style={{ color: "var(--ink-faint)" }}>{comic.year}</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            {/* User's active project cover */}
            {hasProject && (
              <div className="shrink-0 relative group" style={{ width: 90, height: 130 }}>
                <Link href="/creator" className="block w-full h-full rounded-xl overflow-hidden transition-all hover:scale-105"
                  style={{ cursor: "pointer" }}>
                  <div className="w-full h-full flex flex-col justify-between p-2"
                    style={{ background: "linear-gradient(160deg, var(--panel) 0%, var(--surface) 100%)", border: "2px solid #f5c842" }}>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-base font-black"
                        style={{ borderColor: "#f5c842", color: "#f5c842", background: "rgba(245,200,66,0.1)" }}>
                        {projectName[0]}
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold uppercase tracking-wide mb-0.5" style={{ color: "#f5c842" }}>Your Project</div>
                      <div className="text-[9px] font-bold leading-tight truncate" style={{ color: "var(--ink)" }}>{projectName}</div>
                    </div>
                  </div>
                </Link>
                {/* Delete button — appears on hover */}
                <button
                  onClick={(e) => { e.preventDefault(); setShowDeleteModal(true); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold hidden group-hover:flex transition-all"
                  style={{ background: "#ef4444", color: "#fff", cursor: "pointer",
                    border: "1.5px solid var(--surface)", zIndex: 10 }}
                  title="Delete project">
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6 sm:mb-8 sm:grid-cols-4">
          {[
            { label: "Modules",        value: "8",     sub: "AI agents" },
            { label: "Memory Layer",   value: "1",     sub: "CanonCore™" },
            { label: "Export Formats", value: "4+",    sub: "PDF · CBZ · Web" },
            { label: "Status",         value: hasProject ? "Active" : "Ready",
              sub: hasProject ? projectName : "Start with Bob Director" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl px-3 py-3 sm:px-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xl font-bold" style={{ color: "var(--ink)" }}>{stat.value}</div>
              <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "var(--ink-muted)" }}>{stat.label}</div>
              <div className="text-[10px] sm:text-[11px] mt-0.5 truncate" style={{ color: "var(--ink-faint)" }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Active project danger zone ─────────────────────────────────────── */}
        {hasProject && (
          <div className="mb-4 sm:mb-6 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap"
            style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold" style={{ color: "#ef4444" }}>Active project</div>
              <div className="text-[12px] font-medium truncate" style={{ color: "var(--ink)" }}>{projectName}</div>
              <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                All modules are reading from this project. Delete to start fresh.
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/creator" className="px-3 py-1.5 text-[11px] font-bold rounded-lg"
                style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}>
                Open
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>
                Delete project
              </button>
            </div>
          </div>
        )}

        {/* ── Module grid ────────────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>All Modules</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--ink-faint)" }}>8 of 8 active</span>
            {binCount > 0 && (
              <Link href="/recyclebin"
                className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg"
                style={{ color: "var(--ink-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4H13M6 4V2H10V4M5 4V13H11V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Bin ({binCount})
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {modules.map((mod) => (
            <Link key={mod.id} href={mod.href}
              className="group flex flex-row sm:flex-col gap-3 p-3 sm:p-4 rounded-xl transition-all duration-150"
              style={{ background: "var(--surface)", border: "1px solid var(--border)",
                borderTopColor: mod.color, borderTopWidth: "2px", cursor: "pointer" }}>
              <div className="flex items-center gap-3 sm:items-start sm:justify-between sm:flex-row w-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: mod.bg, color: mod.color }}>{mod.icon}</div>
                <span className="hidden sm:inline text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ml-auto"
                  style={{ color: mod.color, background: mod.bg }}>{mod.status}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>
                  {mod.label}<span className="text-[9px] align-super ml-0.5 opacity-40">™</span>
                </div>
                <p className="text-[11px] sm:text-[12px] mt-0.5 sm:mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--ink-muted)" }}>{mod.description}</p>
              </div>
              <div className="hidden sm:flex mt-auto text-[11px] font-semibold items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: mod.color }}>
                Open module
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Challenge callout ────────────────────────────────────────────────── */}
        <div className="mt-6 sm:mt-8 rounded-xl px-4 sm:px-6 py-4 sm:py-5 flex items-start gap-3 sm:gap-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ borderColor: "#f5c842" }}>
            <span className="font-bold text-xs" style={{ color: "#f5c842" }}>B</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold mb-1" style={{ color: "var(--ink)" }}>Reimagine Creative Industries with AI</div>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              Bob Comic Studio is built for the IBM AI Builders Challenge — July theme. Eight AI agents share a single
              persistent memory layer (CanonCore™) to give every creator a{" "}
              <span style={{ color: "var(--ink)" }}>human-led, AI-accelerated</span>{" "}storytelling experience.
            </p>
          </div>
          <Link href="/login" className="shrink-0 px-3 py-1.5 text-[12px] font-bold rounded-lg"
            style={{ background: "#f5c842", color: "#0d0d0f", cursor: "pointer" }}>
            Sign In
          </Link>
        </div>
      </div>
    </>
  );
}
