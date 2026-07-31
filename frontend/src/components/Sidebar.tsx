"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useEffect } from "react";
import { getRecycleBin } from "@/lib/projectStore";

const modules = [
  { id: "director",      label: "Bob Director",    href: "/director",       color: "#f5c842",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor" /></svg> },
  { id: "canoncore",     label: "CanonCore",        href: "/canoncore",      color: "#7c5cd8",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 5V11C3 12.38 5.24 13.5 8 13.5C10.76 13.5 13 12.38 13 11V5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 8C3 9.38 5.24 10.5 8 10.5C10.76 10.5 13 9.38 13 8" stroke="currentColor" strokeWidth="1.5" /></svg> },
  { id: "creator",       label: "Creator Mode",     href: "/creator",        color: "#3b82f6",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /><rect x="8.5" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" /></svg> },
  { id: "charforge",     label: "CharacterForge",   href: "/characterforge", color: "#e84393",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M2 14C2 11.24 4.69 9 8 9C11.31 9 14 11.24 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
  { id: "worldforge",    label: "WorldForge",        href: "/worldforge",    color: "#10b981",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M2 8H14M8 2C6.5 4.5 6.5 11.5 8 14M8 2C9.5 4.5 9.5 11.5 8 14" stroke="currentColor" strokeWidth="1.5" /></svg> },
  { id: "plotsmith",     label: "PlotSmith",          href: "/plotsmith",    color: "#f97316",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M3 8H10M3 12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> },
  { id: "canonguard",    label: "CanonGuard",         href: "/canonguard",   color: "#ef4444",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 4.5V8.5C13 11.26 10.76 13.76 8 14.5C5.24 13.76 3 11.26 3 8.5V4.5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M5.5 8L7.5 10L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
  { id: "publish",       label: "Publish Studio",     href: "/publish",      color: "#06b6d4",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 12V13.5H13V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M8 2V10M8 10L5.5 7.5M8 10L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  // Three modes:
  //   "expanded"  — full 220px sidebar (desktop ≥900px)
  //   "icon"      — 52px icon-only (desktop 640–899px)
  //   "hidden"    — completely off-screen (mobile <640px), toggled by hamburger
  type SidebarMode = "expanded" | "icon" | "hidden";
  const [mode,        setMode]        = useState<SidebarMode>("expanded");
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [binCount,    setBinCount]    = useState(0);

  // Compute mode from window width
  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      if (w >= 900)      setMode("expanded");
      else if (w >= 640) setMode("icon");
      else               setMode("hidden");
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Read bin count on mount + whenever pathname changes (navigating back)
  useEffect(() => { setBinCount(getRecycleBin().length); }, [pathname]);

  // Allow manual toggle for icon ↔ expanded on desktop
  function toggleDesktop() {
    if (mode === "expanded") setMode("icon");
    else if (mode === "icon") setMode("expanded");
  }

  const isMobile   = mode === "hidden";
  const isCollapsed = mode === "icon";
  const showDrawer = isMobile && mobileOpen;
  const w = isCollapsed ? "52px" : "220px";

  // ── Sidebar inner content (shared between desktop and mobile drawer) ───────
  function SidebarInner({ forceExpanded = false }: { forceExpanded?: boolean }) {
    const expanded = forceExpanded || !isCollapsed;
    return (
      <>
        {/* Wordmark / collapse toggle */}
        <div className="flex items-center px-3 pt-4 pb-3 gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={isMobile ? () => setMobileOpen(false) : toggleDesktop}
            className="flex items-center gap-2 min-w-0 w-full"
            style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="relative w-7 h-7 border-2 rounded-[2px] flex items-center justify-center shrink-0" style={{ borderColor: "#f5c842" }}>
              <div className="absolute inset-0.5 border rounded-[1px]" style={{ borderColor: "rgba(245,200,66,0.3)" }} />
              <span className="font-bold text-xs leading-none" style={{ color: "#f5c842" }}>B</span>
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm leading-tight tracking-wide whitespace-nowrap" style={{ color: "var(--ink)" }}>Bob Comic</div>
                <div className="font-bold text-[10px] leading-tight tracking-[0.2em] uppercase" style={{ color: "#f5c842" }}>Studio</div>
              </div>
            )}
            {expanded && isMobile && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="ml-auto shrink-0" style={{ color: "var(--ink-faint)" }}>
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col flex-1 px-1.5 py-3 gap-0.5 overflow-y-auto">
          {/* Dashboard */}
          <Link
            href="/"
            title="Dashboard"
            className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
            style={{
              background: pathname === "/" ? "var(--panel)" : "transparent",
              color: pathname === "/" ? "var(--ink)" : "var(--ink-muted)",
              justifyContent: !expanded ? "center" : undefined,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M2 6.5L8 2L14 6.5V14H10V10H6V14H2V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {expanded && <span>Dashboard</span>}
          </Link>

          {expanded && (
            <>
              <div className="mx-2 my-1.5" style={{ borderTop: "1px solid var(--panel)" }} />
              <div className="px-2 mb-1 text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>Modules</div>
            </>
          )}
          {!expanded && <div className="my-1.5 mx-1" style={{ borderTop: "1px solid var(--panel)" }} />}

          {modules.map((mod) => {
            const isActive = pathname.startsWith(mod.href);
            return (
              <Link
                key={mod.id}
                href={mod.href}
                title={mod.label}
                className="relative flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 hover:bg-[var(--panel)]"
                style={{
                  borderLeftColor: isActive ? mod.color : "transparent",
                  background: isActive ? "var(--panel)" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink-muted)",
                  justifyContent: !expanded ? "center" : undefined,
                }}
              >
                <span style={{ color: isActive ? mod.color : "var(--ink-muted)", flexShrink: 0 }}>{mod.icon}</span>
                {expanded && <span className="flex-1 truncate">{mod.label}</span>}
                {expanded && isActive && (
                  <span className="text-[9px] font-bold tracking-wide opacity-60" style={{ color: mod.color }}>™</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Recycle bin link — above footer */}
        {binCount > 0 && (
          <div className="px-1.5 pb-1">
            <Link
              href="/recyclebin"
              title="Recycle Bin"
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 hover:bg-[var(--panel)]"
              style={{
                borderLeftColor: pathname === "/recyclebin" ? "#ef4444" : "transparent",
                background: pathname === "/recyclebin" ? "var(--panel)" : "transparent",
                color: pathname === "/recyclebin" ? "var(--ink)" : "var(--ink-muted)",
                justifyContent: !expanded ? "center" : undefined,
              }}
            >
              <span style={{ color: pathname === "/recyclebin" ? "#ef4444" : "var(--ink-muted)", flexShrink: 0, position: "relative" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4H14M5.5 4V2.5H10.5V4M4 4L4.5 13H11.5L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 7V10.5M9 7V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {/* Badge */}
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: "#ef4444", color: "#fff" }}>{binCount > 9 ? "9+" : binCount}</span>
              </span>
              {expanded && <span className="flex-1 truncate">Recycle Bin</span>}
              {expanded && binCount > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{binCount}</span>
              )}
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="px-2 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={toggle}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="w-full flex items-center px-2 py-2 rounded-lg mb-2 transition-all duration-150"
            style={{
              background: "var(--panel)", border: "1px solid var(--border)",
              color: "var(--ink-muted)", cursor: "pointer",
              justifyContent: !expanded ? "center" : "space-between",
            }}
          >
            <span style={{ fontSize: 14 }}>{isDark ? "🌙" : "☀️"}</span>
            {expanded && (
              <>
                <span className="text-[11px] font-medium ml-2" style={{ color: "var(--ink-muted)" }}>
                  {isDark ? "Dark" : "Light"}
                </span>
                <div className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0 ml-auto" style={{ background: isDark ? "#f5c842" : "var(--border)" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200" style={{ left: isDark ? "calc(100% - 18px)" : "2px", background: isDark ? "#0d0d0f" : "#ffffff" }} />
                </div>
              </>
            )}
          </button>
          {expanded && (
            <div className="text-[10px] leading-relaxed px-1" style={{ color: "var(--ink-faint)" }}>
              <span className="font-semibold" style={{ color: "var(--ink-muted)" }}>BCS</span> · IBM AI Builders
              <br />Human-Led. AI-Accelerated.
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Mobile: hamburger bar at top + slide-over drawer ──────────────────────
  if (isMobile) {
    return (
      <>
        {/* Top mobile bar */}
        <div
          className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 py-3 gap-3"
          style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", height: 52 }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--ink-muted)" }}
            aria-label="Open navigation"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 border-2 rounded-[2px] flex items-center justify-center" style={{ borderColor: "#f5c842" }}>
              <span className="font-bold text-[10px] leading-none" style={{ color: "#f5c842" }}>B</span>
            </div>
            <div>
              <span className="font-bold text-sm leading-none" style={{ color: "var(--ink)" }}>Bob Comic </span>
              <span className="font-bold text-[10px] tracking-[0.15em] uppercase" style={{ color: "#f5c842" }}>Studio</span>
            </div>
          </div>
        </div>
        {/* Spacer so page content clears the fixed bar */}
        <div style={{ height: 52, flexShrink: 0 }} />

        {/* Backdrop */}
        {showDrawer && (
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className="fixed top-0 left-0 bottom-0 z-[70] flex flex-col overflow-hidden transition-transform duration-250"
          style={{
            width: 260,
            background: "var(--bg)",
            borderRight: "1px solid var(--border)",
            transform: showDrawer ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          <SidebarInner forceExpanded={true} />
        </aside>
      </>
    );
  }

  // ── Desktop: always-visible sidebar (expanded or icon-only) ───────────────
  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-200"
      style={{ width: w, minWidth: w, background: "var(--bg)", borderRight: "1px solid var(--border)" }}
    >
      <SidebarInner />
    </aside>
  );
}
