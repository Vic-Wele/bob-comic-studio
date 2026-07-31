"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { loadProject, saveProject } from "@/lib/projectStore";

const COLOR = "#3b82f6";
const BG    = "rgba(59,130,246,0.08)";

type ToolId   = "select" | "draw" | "erase" | "text" | "shape" | "image" | "balloon";
type LayoutId = "1x3" | "2x2" | "1-2" | "2-1" | "full";

const TOOLS: { id: ToolId; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "select",  label: "Select",  hint: "Click panels or elements to select",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 2L3 12L6.5 9.5L8 13L9.5 12.5L8 9H12L3 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  { id: "draw",    label: "Draw",    hint: "Freehand drawing on the panel canvas",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12L5 9L10 4L12 6L7 11L4 14L2 12Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10 4L12 2L14 4L12 6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  { id: "erase",   label: "Erase",   hint: "Click a stroke to erase it",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 13H13M9 3L13 7L7 13H3V9L9 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  { id: "text",    label: "Text",    hint: "Click a panel to add or edit text",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4H13M8 4V13M5 13H11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg> },
  { id: "shape",   label: "Shape",   hint: "Draw rectangles, circles, and borders",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg> },
  { id: "image",   label: "Image",   hint: "Generate or place an image in a panel",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.4"/><circle cx="5.5" cy="6.5" r="1" fill="currentColor"/><path d="M2 11L5 8L8 11L11 7.5L14 11" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
  { id: "balloon", label: "Balloon", hint: "Add a speech or thought balloon",
    icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3H13C13.55 3 14 3.45 14 4V10C14 10.55 13.55 11 13 11H7L4 14V11H3C2.45 11 2 10.55 2 10V4C2 3.45 2.45 3 3 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg> },
];

// Layout definitions — each entry is an array of flex/grid weights
const LAYOUTS: { id: LayoutId; label: string; cols: number[]; rows?: number }[] = [
  { id: "1x3",  label: "Strip",  cols: [1, 1, 1]       },
  { id: "2x2",  label: "Grid",   cols: [1, 1, 1, 1], rows: 2 },
  { id: "1-2",  label: "1 + 2",  cols: [2, 1, 1]       },
  { id: "2-1",  label: "2 + 1",  cols: [1, 1, 2]       },
  { id: "full", label: "Full",   cols: [1]              },
];

interface DrawStroke { points: [number, number][]; color: string; width: number }
interface TextLayer  { id: string; x: number; y: number; text: string; size: number; color: string }
interface ShapeLayer { id: string; x: number; y: number; w: number; h: number; color: string; fill: boolean }
interface BalloonLayer { id: string; x: number; y: number; text: string; type: "speech" | "thought" }

interface Panel {
  id: number;
  caption: string;
  dialogue: string;
  desc: string;
  imageUrl: string | null;
  bgColor: string;
  strokes: DrawStroke[];
  texts: TextLayer[];
  shapes: ShapeLayer[];
  balloons: BalloonLayer[];
}

const PANEL_BG_COLORS = [
  "#1a1a2e", "#1a0a2e", "#0a1628", "#2e1a0a", "#0a2e1a",
];

function makePanel(id: number, desc = "", dialogue = ""): Panel {
  return {
    id, caption: `Panel ${id}`, dialogue, desc,
    imageUrl: null, bgColor: PANEL_BG_COLORS[(id - 1) % PANEL_BG_COLORS.length],
    strokes: [], texts: [], shapes: [], balloons: [],
  };
}

// Returns true if point [px,py] is within `threshold` px of any segment in a stroke
function pointNearStroke(px: number, py: number, stroke: DrawStroke, threshold = 12): boolean {
  const pts = stroke.points;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) continue;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const nx = ax + t * dx - px, ny = ay + t * dy - py;
    if (nx * nx + ny * ny <= threshold * threshold) return true;
  }
  return false;
}

// Canvas overlay — handles draw and erase pointer events
function DrawCanvas({ panel, tool, color, strokeWidth, onStrokeDone, onEraseAt }: {
  panel: Panel; tool: ToolId; color: string; strokeWidth: number;
  onStrokeDone: (stroke: DrawStroke) => void;
  onEraseAt: (px: number, py: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const current   = useRef<[number, number][]>([]);

  // Redraw all strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    panel.strokes.forEach((s) => {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.width;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.moveTo(s.points[0][0], s.points[0][1]);
      s.points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.stroke();
    });
  }, [panel.strokes]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const r = canvasRef.current!.getBoundingClientRect();
    // Scale to canvas resolution
    const scaleX = canvasRef.current!.width  / r.width;
    const scaleY = canvasRef.current!.height / r.height;
    return [(e.clientX - r.left) * scaleX, (e.clientY - r.top) * scaleY];
  }

  const active = tool === "draw" || tool === "erase";

  return (
    <canvas
      ref={canvasRef}
      width={400} height={220}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: active ? "auto" : "none",
        cursor: tool === "draw" ? "crosshair" : tool === "erase" ? "cell" : "default" }}
      onMouseDown={(e) => {
        if (tool === "erase") { onEraseAt(...getPos(e)); return; }
        if (tool !== "draw") return;
        drawing.current = true; current.current = [getPos(e)];
      }}
      onMouseMove={(e) => {
        if (tool === "erase" && e.buttons === 1) { onEraseAt(...getPos(e)); return; }
        if (!drawing.current || tool !== "draw") return;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const pos = getPos(e);
        current.current.push(pos);
        if (current.current.length >= 2) {
          const pts = current.current;
          ctx.beginPath();
          ctx.strokeStyle = color; ctx.lineWidth = strokeWidth;
          ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
          ctx.lineTo(pos[0], pos[1]);
          ctx.stroke();
        }
      }}
      onMouseUp={() => {
        if (!drawing.current) return;
        drawing.current = false;
        if (current.current.length > 1) {
          onStrokeDone({ points: [...current.current], color, width: strokeWidth });
        }
        current.current = [];
      }}
      onMouseLeave={() => { drawing.current = false; current.current = []; }}
    />
  );
}

export default function CreatorPage() {
  const [selectedTool,    setSelectedTool]    = useState<ToolId>("select");
  const [selectedLayout,  setSelectedLayout]  = useState<LayoutId>("1x3");
  const [selectedPanel,   setSelectedPanel]   = useState<number | null>(1);
  const [panels,          setPanels]          = useState<Panel[]>(() => [makePanel(1), makePanel(2), makePanel(3)]);
  const [generating,      setGenerating]      = useState<number | null>(null);
  const [saved,           setSaved]           = useState(false);
  const [drawColor,       setDrawColor]       = useState("#3b82f6");
  const [strokeWidth,     setStrokeWidth]     = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [zoom,            setZoom]            = useState(1);

  // Undo/Redo stacks
  const undoStack = useRef<Panel[][]>([]);
  const redoStack = useRef<Panel[][]>([]);

  // Balloon drag state
  const dragState = useRef<{ balloonId: string; panelId: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [editingBalloon, setEditingBalloon] = useState<{ panelId: number; balloonId: string } | null>(null);
  const [editBalloonText, setEditBalloonText] = useState("");

  // Load panels from PlotSmith store on mount
  useEffect(() => {
    try {
      const stored = loadProject();
      if (!stored.plot) return;
      const raw = stored.plot.panels;
      const src = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
      if (!Array.isArray(src) || src.length === 0) return;
      setPanels(src.map((p: { panel: number; action?: string; dialogue?: string }, i: number) =>
        makePanel(p.panel ?? i + 1, p.action ?? "", p.dialogue ?? "")
      ));
      setSelectedPanel(src[0]?.panel ?? 1);
    } catch { /* keep defaults */ }
  }, []);

  // Push current state onto undo stack before a destructive change
  function checkpoint() {
    undoStack.current = [...undoStack.current, panels.map((p) => ({ ...p, strokes: [...p.strokes] }))];
    redoStack.current = [];
  }

  function undo() {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, panels.map((p) => ({ ...p }))];
    setPanels(prev);
  }

  function redo() {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, panels.map((p) => ({ ...p }))];
    setPanels(next);
  }

  // Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y redo, Ctrl+S save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function updatePanel(id: number, changes: Partial<Panel>) {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, ...changes } : p));
  }

  function addPanel() {
    checkpoint();
    const nextId = Math.max(...panels.map((p) => p.id)) + 1;
    setPanels((prev) => [...prev, makePanel(nextId)]);
    setSelectedPanel(nextId);
  }

  function removePanel(id: number) {
    if (panels.length <= 1) return;
    checkpoint();
    const next = panels.filter((p) => p.id !== id);
    setPanels(next);
    setSelectedPanel(next[0].id);
  }

  function handleStrokeDone(panelId: number, stroke: DrawStroke) {
    checkpoint();
    setPanels((prev) => prev.map((p) =>
      p.id === panelId ? { ...p, strokes: [...p.strokes, stroke] } : p
    ));
  }

  function clearDrawing(panelId: number) {
    checkpoint();
    updatePanel(panelId, { strokes: [] });
  }

  // Add text element to a panel
  function addTextToPanel(panelId: number) {
    const text = prompt("Enter text for this panel:");
    if (!text?.trim()) return;
    checkpoint();
    updatePanel(panelId, {
      texts: [...(panels.find((p) => p.id === panelId)?.texts ?? []),
        { id: Date.now().toString(), x: 50, y: 50, text, size: 14, color: "#ffffff" }]
    });
  }

  // Add a speech balloon
  function addBalloon(panelId: number) {
    const text = prompt("Balloon text:");
    if (!text?.trim()) return;
    checkpoint();
    updatePanel(panelId, {
      balloons: [...(panels.find((p) => p.id === panelId)?.balloons ?? []),
        { id: Date.now().toString(), x: 30, y: 20, text, type: "speech" }]
    });
  }

  async function generatePanelImage(panelId: number) {
    checkpoint();
    setGenerating(panelId);
    await new Promise((r) => setTimeout(r, 1800));
    const panel = panels.find((p) => p.id === panelId);
    const seed  = encodeURIComponent((panel?.desc ?? "comic panel").slice(0, 40));
    updatePanel(panelId, { imageUrl: `https://picsum.photos/seed/${seed}/400/300` });
    setGenerating(null);
  }

  function handleSave() {
    // Persist panel layout/content to projectStore
    const stored = loadProject();
    if (stored.plot) {
      const updatedPanels = panels.map((p) => ({
        panel: p.id, action: p.desc, dialogue: p.dialogue, type: "Medium",
      }));
      saveProject({ plot: { ...stored.plot, panels: updatedPanels } });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleExport() {
    // Export panels as JSON data (real export would render to PDF/CBZ)
    const data = {
      exportedAt: new Date().toISOString(),
      layout: selectedLayout,
      panels: panels.map((p) => ({
        id: p.id, caption: p.caption, desc: p.desc,
        dialogue: p.dialogue, imageUrl: p.imageUrl,
        texts: p.texts, balloons: p.balloons,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "comic-page.json"; a.click();
  }

  // Handle panel click based on active tool
  const handlePanelClick = useCallback((panelId: number, e: React.MouseEvent) => {
    setSelectedPanel(panelId);
    if (selectedTool === "text")    addTextToPanel(panelId);
    if (selectedTool === "balloon") addBalloon(panelId);
    if (selectedTool === "image")   generatePanelImage(panelId);
    void e;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTool, panels]);

  const currentPanel = panels.find((p) => p.id === selectedPanel) ?? null;
  const layout = LAYOUTS.find((l) => l.id === selectedLayout) ?? LAYOUTS[0];

  // Build panel rows for 2x2 layout
  function renderPanelGrid() {
    if (selectedLayout === "2x2") {
      const rows: Panel[][] = [];
      for (let i = 0; i < panels.length; i += 2) rows.push(panels.slice(i, i + 2));
      return rows.map((row, ri) => (
        <div key={ri} className="flex gap-1 flex-1">{row.map((p) => renderPanel(p, 1))}</div>
      ));
    }
    return <div className="flex gap-1 flex-1">{panels.map((p, i) => renderPanel(p, layout.cols[i] ?? 1))}</div>;
  }

  // Erase strokes near a point in a panel
  function handleEraseAt(panelId: number, px: number, py: number) {
    setPanels((prev) => prev.map((p) => {
      if (p.id !== panelId) return p;
      const filtered = p.strokes.filter((s) => !pointNearStroke(px, py, s));
      if (filtered.length === p.strokes.length) return p;
      return { ...p, strokes: filtered };
    }));
  }

  function renderPanel(panel: Panel, flex: number) {
    const isSelected = selectedPanel === panel.id;
    const cursorMap: Record<ToolId, string> = {
      select: "default", draw: "crosshair", erase: "cell", text: "text",
      shape: "crosshair", image: "copy", balloon: "cell",
    };

    // Balloon drag handlers — attached to the panel container
    function onPanelMouseMove(e: React.MouseEvent<HTMLDivElement>) {
      if (!dragState.current || dragState.current.panelId !== panel.id) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const dx = ((e.clientX - dragState.current.startX) / rect.width)  * 100;
      const dy = ((e.clientY - dragState.current.startY) / rect.height) * 100;
      setPanels((prev) => prev.map((p) => {
        if (p.id !== panel.id) return p;
        return {
          ...p,
          balloons: p.balloons.map((b) =>
            b.id === dragState.current!.balloonId
              ? { ...b, x: Math.max(0, Math.min(85, dragState.current!.origX + dx)),
                        y: Math.max(0, Math.min(85, dragState.current!.origY + dy)) }
              : b
          ),
        };
      }));
    }

    function onPanelMouseUp() {
      dragState.current = null;
    }

    return (
      <div key={panel.id}
        onClick={(e) => handlePanelClick(panel.id, e)}
        onMouseMove={onPanelMouseMove}
        onMouseUp={onPanelMouseUp}
        onMouseLeave={onPanelMouseUp}
        className="flex flex-col rounded overflow-hidden relative"
        style={{ flex, minHeight: 180, cursor: cursorMap[selectedTool],
          outline: isSelected ? `2px solid ${COLOR}` : "1px solid var(--border)" }}>

        {/* Panel background / image */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center"
          style={{ background: panel.imageUrl ? "black" : panel.bgColor, minHeight: 140 }}>
          {panel.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={panel.imageUrl} alt={panel.desc} className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
          )}

          {/* Draw canvas overlay */}
          <DrawCanvas
            panel={panel} tool={selectedTool}
            color={drawColor} strokeWidth={strokeWidth}
            onStrokeDone={(stroke) => handleStrokeDone(panel.id, stroke)}
            onEraseAt={(px, py) => handleEraseAt(panel.id, px, py)}
          />

          {/* Text layers */}
          {panel.texts.map((t) => (
            <div key={t.id} className="absolute pointer-events-none font-bold"
              style={{ left: `${t.x}%`, top: `${t.y}%`, fontSize: t.size, color: t.color,
                textShadow: "0 1px 3px rgba(0,0,0,0.8)", maxWidth: "80%" }}>
              {t.text}
            </div>
          ))}

          {/* Balloon layers — draggable + double-click to edit + × to delete */}
          {panel.balloons.map((b) => {
            const isEditing = editingBalloon?.panelId === panel.id && editingBalloon?.balloonId === b.id;
            return (
              <div key={b.id} className="absolute group"
                style={{ left: `${b.x}%`, top: `${b.y}%`, maxWidth: "70%",
                  cursor: "grab", zIndex: 20, pointerEvents: "auto" }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (isEditing) return;
                  dragState.current = {
                    balloonId: b.id, panelId: panel.id,
                    startX: e.clientX, startY: e.clientY,
                    origX: b.x, origY: b.y,
                  };
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingBalloon({ panelId: panel.id, balloonId: b.id });
                  setEditBalloonText(b.text);
                }}>
                <div className="bg-white text-[#0d0d0f] px-2 py-1 rounded-lg text-[11px] font-medium leading-tight relative select-none"
                  style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editBalloonText}
                      onChange={(e) => setEditBalloonText(e.target.value)}
                      onBlur={() => {
                        updatePanel(panel.id, {
                          balloons: panel.balloons.map((bl) =>
                            bl.id === b.id ? { ...bl, text: editBalloonText } : bl
                          ),
                        });
                        setEditingBalloon(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") { setEditingBalloon(null); }
                      }}
                      className="text-[11px] outline-none border-none w-full bg-transparent"
                      style={{ minWidth: 60, cursor: "text" }}
                    />
                  ) : b.text}
                  {/* Delete × */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      checkpoint();
                      updatePanel(panel.id, { balloons: panel.balloons.filter((bl) => bl.id !== b.id) });
                    }}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full text-[9px] font-bold items-center justify-center hidden group-hover:flex"
                    style={{ background: "#ef4444", color: "#fff", cursor: "pointer", border: "1px solid white" }}>
                    ×
                  </button>
                  {/* Tail */}
                  <div className="absolute -bottom-1.5 left-3 w-3 h-3 bg-white"
                    style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {!panel.imageUrl && panel.strokes.length === 0 && panel.texts.length === 0 && panel.balloons.length === 0 && (
            <div className="text-center px-3 z-10">
              <div className="text-[9px] uppercase tracking-wide mb-1.5 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.35)" }}>{panel.desc || "Empty panel"}</div>
              {selectedTool === "select" && (
                <button onClick={(e) => { e.stopPropagation(); generatePanelImage(panel.id); }}
                  disabled={generating !== null}
                  className="text-[9px] font-bold px-2 py-1 border border-dashed rounded transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: COLOR, color: COLOR, cursor: "pointer" }}>
                  {generating === panel.id ? "Generating…" : "⚡ Generate Image"}
                </button>
              )}
            </div>
          )}

          {/* Panel badge */}
          <div className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)" }}>
            {String(panel.id).padStart(2, "0")}
          </div>

          {/* Remove button on selected */}
          {isSelected && panels.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); removePanel(panel.id); }}
              className="absolute top-1.5 right-1.5 text-[10px] w-5 h-5 rounded flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.8)", color: "#fff", cursor: "pointer" }}>
              ✕
            </button>
          )}
        </div>

        {/* Dialogue caption */}
        {panel.dialogue && (
          <div className="bg-white text-[#0d0d0f] px-2 py-1 text-[10px] italic font-medium leading-tight"
            style={{ borderTop: "1px solid var(--border)" }}>
            {panel.dialogue}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: BG, color: COLOR }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="8.5" y="2" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="2" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
            <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="mr-2">
          <h1 className="text-sm font-bold leading-none" style={{ color: "var(--ink)" }}>
            Creator Mode<span className="text-[9px] align-super ml-0.5 opacity-50">™</span>
          </h1>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
            Issue #1 · {panels.length} panels · {TOOLS.find((t) => t.id === selectedTool)?.label}
          </p>
        </div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {/* Undo / Redo */}
          <button onClick={undo} title="Undo (Ctrl+Z)" disabled={undoStack.current.length === 0}
            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg disabled:opacity-30"
            style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", background: "var(--surface)", cursor: "pointer" }}>
            ↩ Undo
          </button>
          <button onClick={redo} title="Redo (Ctrl+Y)" disabled={redoStack.current.length === 0}
            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg disabled:opacity-30"
            style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", background: "var(--surface)", cursor: "pointer" }}>
            ↪ Redo
          </button>
          {/* Save */}
          <button onClick={handleSave} title="Save (Ctrl+S)"
            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg"
            style={{ border: `1px solid ${saved ? "#10b981" : "var(--border)"}`,
              color: saved ? "#10b981" : "var(--ink-muted)", background: "var(--surface)", cursor: "pointer" }}>
            {saved ? "✓ Saved" : "Save"}
          </button>
          {/* Export */}
          <button onClick={handleExport}
            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg"
            style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
            Export
          </button>
        </div>
      </div>

      {/* Main editor area — on mobile: left toolbar + canvas stacked, right panel below */}
      <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
        {/* Left toolbar — horizontal on mobile, vertical on desktop */}
        <div className="sm:w-[48px] shrink-0 flex sm:flex-col items-center px-2 sm:px-0 py-2 sm:py-3 gap-1 overflow-x-auto sm:overflow-visible"
          style={{ borderBottom: "1px solid var(--border)", borderRight: "none" }}>
          <style>{`@media (min-width:640px){.creator-toolbar{border-right:1px solid var(--border);border-bottom:none;}}`}</style>
          <div className="creator-toolbar flex sm:flex-col items-center gap-1 w-full sm:w-auto">
            {TOOLS.map((tool) => {
              const active = selectedTool === tool.id;
              return (
                <button key={tool.id} title={`${tool.label} — ${tool.hint}`}
                  onClick={() => setSelectedTool(tool.id)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-90"
                  style={{ cursor: "pointer", background: active ? BG : "transparent",
                    color: active ? COLOR : "var(--ink-muted)", border: `1px solid ${active ? COLOR : "transparent"}` }}>
                  {tool.icon}
                </button>
              );
            })}
          </div>
          <div className="hidden sm:block w-6 my-1" style={{ borderTop: "1px solid var(--border)" }} />

          {/* Draw color picker */}
          {selectedTool === "draw" && (
            <div className="relative">
              <button onClick={() => setShowColorPicker((v) => !v)}
                className="w-7 h-7 rounded border-2" title="Pen colour"
                style={{ background: drawColor, borderColor: "var(--border)", cursor: "pointer" }} />
              {showColorPicker && (
                <div className="absolute left-10 top-0 p-2 rounded-xl z-50 flex flex-col gap-1"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                  {["#ffffff","#3b82f6","#ef4444","#10b981","#f5c842","#7c5cd8","#f97316","#000000"].map((c) => (
                    <button key={c} onClick={() => { setDrawColor(c); setShowColorPicker(false); }}
                      className="w-5 h-5 rounded" style={{ background: c, border: drawColor === c ? `2px solid ${COLOR}` : "1px solid var(--border)", cursor: "pointer" }} />
                  ))}
                  <div className="text-[9px] mt-1" style={{ color: "var(--ink-faint)" }}>Width</div>
                  {[1, 2, 4, 8].map((w) => (
                    <button key={w} onClick={() => setStrokeWidth(w)}
                      className="text-[9px] px-1 rounded"
                      style={{ background: strokeWidth === w ? BG : "transparent", color: strokeWidth === w ? COLOR : "var(--ink-muted)", cursor: "pointer" }}>
                      {w}px
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Zoom */}
          <button title="Zoom in" onClick={() => setZoom((z) => Math.min(2, parseFloat((z + 0.1).toFixed(1))))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold hover:opacity-80"
            style={{ color: "var(--ink-muted)", cursor: "pointer" }}>+</button>
          <button title={`Zoom ${Math.round(zoom * 100)}%`}
            onClick={() => setZoom(1)}
            className="text-[9px] font-bold leading-none hover:opacity-80"
            style={{ color: "var(--ink-faint)", cursor: "pointer" }}>{Math.round(zoom * 100)}%</button>
          <button title="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, parseFloat((z - 0.1).toFixed(1))))}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold hover:opacity-80"
            style={{ color: "var(--ink-muted)", cursor: "pointer" }}>−</button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto flex flex-col items-center py-3 sm:py-6 px-2 sm:px-4"
          style={{ background: "var(--panel)" }}>

          {/* Layout selector */}
          <div className="flex gap-2 mb-4">
            {LAYOUTS.map((l) => (
              <button key={l.id} onClick={() => setSelectedLayout(l.id)}
                className="px-3 py-1 text-[11px] font-medium rounded-lg transition-colors"
                style={{ cursor: "pointer",
                  border: `1px solid ${selectedLayout === l.id ? COLOR : "var(--border)"}`,
                  color: selectedLayout === l.id ? COLOR : "var(--ink-muted)",
                  background: selectedLayout === l.id ? BG : "var(--surface)" }}>
                {l.label}
              </button>
            ))}
          </div>

          {/* Page canvas */}
          <div className="rounded-xl overflow-hidden w-full max-w-[700px]"
            style={{ background: "var(--surface)", border: "2px solid var(--border)",
              transform: `scale(${zoom})`, transformOrigin: "top center",
              marginBottom: zoom > 1 ? `${(zoom - 1) * 100}%` : undefined }}>
            <div className="p-2 flex flex-col gap-1">
              {renderPanelGrid()}
            </div>
          </div>

          {/* Add panel */}
          <div className="flex gap-2 mt-3">
            <button onClick={addPanel}
              className="px-4 py-2 text-sm rounded-lg hover:opacity-80"
              style={{ border: "1px dashed var(--border)", color: "var(--ink-faint)", cursor: "pointer" }}>
              + Add Panel
            </button>
            {currentPanel && currentPanel.strokes.length > 0 && (
              <button onClick={() => clearDrawing(currentPanel.id)}
                className="px-4 py-2 text-sm rounded-lg hover:opacity-80"
                style={{ border: "1px dashed rgba(239,68,68,0.4)", color: "#ef4444", cursor: "pointer" }}>
                Clear Drawing
              </button>
            )}
          </div>

          {/* Tool hint */}
          <div className="text-[10px] mt-2 text-center" style={{ color: "var(--ink-faint)" }}>
            {TOOLS.find((t) => t.id === selectedTool)?.hint} · Ctrl+Z undo · Ctrl+S save
          </div>
        </div>

        {/* Right properties panel — full width below canvas on mobile */}
        <div className="sm:w-[210px] shrink-0 overflow-y-auto" style={{ borderTop: "1px solid var(--border)" }}>
          <style>{`@media (min-width:640px){.creator-props{border-left:1px solid var(--border);border-top:none;}}`}</style>
          <div className="creator-props h-full">
          <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "var(--ink-faint)" }}>
              Panel Properties
            </div>
          </div>

          {currentPanel ? (
            <div className="px-3 py-3 flex flex-col sm:flex-col gap-3 sm:gap-4">
              {/* Description */}
              <div>
                <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Scene Description</label>
                <textarea value={currentPanel.desc}
                  onChange={(e) => updatePanel(currentPanel.id, { desc: e.target.value })}
                  rows={3} className="w-full rounded-lg px-2 py-1.5 text-[11px] resize-none focus:outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }} />
              </div>

              {/* Dialogue */}
              <div>
                <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Dialogue</label>
                <textarea value={currentPanel.dialogue}
                  onChange={(e) => updatePanel(currentPanel.id, { dialogue: e.target.value })}
                  rows={2} className="w-full rounded-lg px-2 py-1.5 text-[11px] resize-none focus:outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)" }} />
              </div>

              {/* Art Style */}
              <div>
                <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Art Style</label>
                <select className="w-full rounded-lg px-2 py-1.5 text-[11px] focus:outline-none"
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", color: "var(--ink)", cursor: "pointer" }}>
                  <option>Ink &amp; Shadow</option>
                  <option>Manga Line Art</option>
                  <option>Watercolor</option>
                  <option>Noir Painted</option>
                  <option>Sci-Fi Digital</option>
                </select>
              </div>

              {/* Panel bg colour */}
              <div>
                <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Background</label>
                <div className="flex gap-1.5 flex-wrap">
                  {PANEL_BG_COLORS.map((c) => (
                    <button key={c} onClick={() => updatePanel(currentPanel.id, { bgColor: c })}
                      className="w-6 h-6 rounded"
                      style={{ background: c, border: currentPanel.bgColor === c ? `2px solid ${COLOR}` : "1px solid var(--border)", cursor: "pointer" }} />
                  ))}
                </div>
              </div>

              {/* Panel image */}
              {currentPanel.imageUrl && (
                <div>
                  <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Panel Image</label>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentPanel.imageUrl} alt="Panel" className="w-full rounded-lg"
                    style={{ border: "1px solid var(--border)" }} />
                  <button onClick={() => updatePanel(currentPanel.id, { imageUrl: null })}
                    className="mt-1 w-full text-[10px] py-1 rounded-lg"
                    style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>
                    Remove image
                  </button>
                </div>
              )}

              {/* Generate image */}
              <button onClick={() => generatePanelImage(currentPanel.id)} disabled={generating !== null}
                className="w-full py-2 text-[11px] font-bold rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: COLOR, color: "#fff", cursor: "pointer" }}>
                {generating === currentPanel.id
                  ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
                  : currentPanel.imageUrl ? "↻ Regenerate Image" : "⚡ Generate Panel Image"}
              </button>

              {/* Quick actions */}
              <div>
                <label className="text-[11px] block mb-1" style={{ color: "var(--ink-muted)" }}>Quick Add</label>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "Add Text",    action: () => addTextToPanel(currentPanel.id) },
                    { label: "Add Balloon", action: () => addBalloon(currentPanel.id) },
                  ].map(({ label, action }) => (
                    <button key={label} onClick={action}
                      className="py-1.5 text-[11px] rounded-lg hover:opacity-80"
                      style={{ border: "1px solid var(--border)", color: "var(--ink-muted)", cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 text-[12px] text-center" style={{ color: "var(--ink-faint)" }}>
              Select a panel to edit its properties
            </div>
          )}
          </div>{/* /creator-props */}
        </div>
      </div>
    </div>
  );
}
