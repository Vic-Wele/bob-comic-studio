/**
 * BCS Project Store — shared localStorage layer.
 * Bob Director writes here when "Create Everything" fires.
 * All modules read from here on mount, falling back to API, then demo data.
 */

export const STORE_KEY   = "bcs_project_v1";
export const BIN_KEY     = "bcs_recycle_bin_v1";
export const DIRECTOR_KEY = "bcs_director_messages";

export interface StoredProject {
  characters: StoredCharacter[];
  world:      StoredWorld | null;
  plot:       StoredPlot  | null;
  updatedAt:  number;
}

export interface StoredCharacter {
  id?: number;
  name: string;
  role: string;
  age?: string;
  gender?: string;
  occupation?: string;
  personality: string | string[];
  appearance: string;
  backstory: string;
  abilities?: string;
  arc: string;
  ai_generated?: boolean;
}

export interface StoredWorld {
  id?: number;
  name: string;
  type: string;
  overview: string;
  geography: string;
  factions: string | { name: string; description: string; alignment: string }[];
  timeline: string | { era: string; event: string }[];
  rules: string;
  ai_generated?: boolean;
}

export interface StoredPlot {
  id?: number;
  premise: string;
  act_one:   { beat: string; description: string }[] | string;
  act_two:   { beat: string; description: string }[] | string;
  act_three: { beat: string; description: string }[] | string;
  panels:    { panel: number; action: string; dialogue?: string; type?: string; notes?: string }[] | string;
  ai_generated?: boolean;
}

// ── Recycle Bin ──────────────────────────────────────────────────────────────

export interface DeletedProject {
  id: string;           // UUID-like string, stable across restores
  name: string;         // world name (or "Untitled") for quick display
  deletedAt: number;    // unix ms
  data: StoredProject;  // full snapshot at time of deletion
  directorMessages: string | null; // serialised Message[] from director chat
}

export function loadProject(): StoredProject {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as StoredProject;
  } catch { /* ignore */ }
  return empty();
}

export function saveProject(data: Partial<StoredProject>) {
  if (typeof window === "undefined") return;
  try {
    const current = loadProject();
    const next: StoredProject = { ...current, ...data, updatedAt: Date.now() };
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function addCharacter(char: StoredCharacter) {
  const p = loadProject();
  const exists = p.characters.findIndex((c) => c.name === char.name);
  if (exists >= 0) p.characters[exists] = char;
  else p.characters.push(char);
  saveProject({ characters: p.characters });
}

/**
 * Soft-delete: snapshot current project + director messages into the recycle
 * bin, then wipe all live project keys. Returns the ID of the deleted entry.
 */
export function deleteProject(): string {
  if (typeof window === "undefined") return "";
  const data    = loadProject();
  const name    = data.world?.name ?? "Untitled Project";
  const dirMsg  = localStorage.getItem(DIRECTOR_KEY);
  const id      = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const entry: DeletedProject = { id, name, deletedAt: Date.now(), data, directorMessages: dirMsg };

  const bin = getRecycleBin();
  bin.unshift(entry);                              // newest first
  try { localStorage.setItem(BIN_KEY, JSON.stringify(bin)); } catch { /* ignore */ }

  // Wipe all live project data
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(DIRECTOR_KEY);
  return id;
}

/** Read the full recycle bin array. */
export function getRecycleBin(): DeletedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BIN_KEY);
    if (raw) return JSON.parse(raw) as DeletedProject[];
  } catch { /* ignore */ }
  return [];
}

/**
 * Restore a deleted project back to the live store.
 * Overwrites any currently active project — the caller should warn the user.
 */
export function restoreProject(id: string): string | null {
  if (typeof window === "undefined") return null;
  const bin   = getRecycleBin();
  const entry = bin.find((e) => e.id === id);
  if (!entry) return null;

  // Put data back into live keys
  localStorage.setItem(STORE_KEY, JSON.stringify({ ...entry.data, updatedAt: Date.now() }));
  if (entry.directorMessages) localStorage.setItem(DIRECTOR_KEY, entry.directorMessages);

  // Remove from bin
  const updated = bin.filter((e) => e.id !== id);
  localStorage.setItem(BIN_KEY, JSON.stringify(updated));
  return entry.name;
}

/**
 * Permanently delete one entry from the recycle bin.
 */
export function permanentlyDelete(id: string): void {
  if (typeof window === "undefined") return;
  const bin = getRecycleBin().filter((e) => e.id !== id);
  localStorage.setItem(BIN_KEY, JSON.stringify(bin));
}

/**
 * Empty the entire recycle bin.
 */
export function emptyBin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BIN_KEY);
}

function empty(): StoredProject {
  return { characters: [], world: null, plot: null, updatedAt: 0 };
}
