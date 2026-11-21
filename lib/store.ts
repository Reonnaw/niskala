import type { Coach } from './coach';
import type { Baseline, ProfileBaseline, Sensitivity } from './signals';

// Everything here is local to the browser. Only `SessionSummary` and part of
// `Prefs` are ever synced (see sync.ts); the calibration baseline never leaves the device.

export type Warmth = 'auto' | 'on' | 'off';
export type Mode = 'camera' | 'timer' | 'demo';
export type Theme = 'auto' | 'light' | 'dark';
export type CameraView = 'front' | 'side';
export type FigureId = 'raka' | 'ayu';

export type Prefs = {
  mode: Mode;
  cameraView: CameraView;
  cameraId: string | null; // null = the browser's default camera
  bedtime: number; // minutes after midnight
  warmth: Warmth;
  sensitivity: Sensitivity;
  eyeMin: number; // 0 = off
  resetMin: number; // 0 = off
  sound: boolean;
  voice: boolean; // spoken reminders and step guidance
  notify: boolean; // system notifications while Niskala is not in focus
  figure: FigureId; // who stands in for you on screen
  sync: boolean;
  onboarded: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  mode: 'demo',
  cameraView: 'front',
  cameraId: null,
  bedtime: 23 * 60,
  warmth: 'auto',
  sensitivity: 'balanced',
  eyeMin: 20,
  resetMin: 50,
  sound: false,
  voice: false,
  notify: false,
  figure: 'raka',
  sync: false,
  onboarded: false,
};

// snake_case so rows go to Supabase unchanged
export type SessionSummary = {
  id: string;
  started_at: string;
  updated_at: string;
  active_s: number;
  resets: number;
  eye_breaks: number;
  slouch_s: number;
  low_blink_s: number;
  late_s: number;
  avg_blink: number | null;
  source: 'camera' | 'timer' | 'simulation';
};

const KEY = {
  prefs: 'niskala:prefs',
  baseline: 'niskala:baseline',
  baselineSide: 'niskala:baseline-side',
  sessions: 'niskala:sessions',
  syncedAt: 'niskala:synced-at',
  theme: 'niskala:theme',
  coach: 'niskala:coach',
};
const MAX_SESSIONS = 200;

// Storage can throw (private mode, quota, blocked cookies); the app must keep working without it.
function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Shaped for useSyncExternalStore: the server snapshot is the fallback, so the
// prerendered shell never depends on what this browser has stored.
function stored<T>(key: string, fallback: T, parse: (v: T | null) => T = (v) => v ?? fallback) {
  const listeners = new Set<() => void>();
  let cache: { v: T } | null = null;
  // Another tab wrote this key: drop the cached copy so every tab sees the same data.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== key && e.key !== null) return;
    cache = null;
    listeners.forEach((l) => l());
  };
  return {
    subscribe(cb: () => void) {
      if (!listeners.size) window.addEventListener('storage', onStorage);
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
        if (!listeners.size) window.removeEventListener('storage', onStorage);
      };
    },
    get: () => (cache ??= { v: parse(read<T>(key)) }).v,
    server: () => fallback,
    set(v: T) {
      cache = { v };
      write(key, v);
      listeners.forEach((l) => l());
    },
  };
}

// Sekar and Bima left with the 2D figures; anyone who picked them gets Raka.
export const prefsStore = stored<Prefs>(KEY.prefs, DEFAULT_PREFS, (v) => ({ ...DEFAULT_PREFS, ...v, figure: v?.figure === 'ayu' ? 'ayu' : 'raka' }));
// Baselines saved before sideways tracking lack roll and cx; asking for a fresh calibration is safer than guessing.
export const baselineStore = stored<Baseline | null>(KEY.baseline, null, (v) => (v && 'roll' in v && 'cx' in v ? v : null));
export const profileBaselineStore = stored<ProfileBaseline | null>(KEY.baselineSide, null, (v) => (v && 'neck' in v && 'trunk' in v ? v : null));
export const themeStore = stored<Theme>(KEY.theme, 'auto');
// The last coaching and the local day it was asked for.
export const coachStore = stored<{ day: string; coach: Coach } | null>(KEY.coach, null);
const NO_SESSIONS: SessionSummary[] = [];
export const sessionsStore = stored<SessionSummary[]>(KEY.sessions, NO_SESSIONS, (v) =>
  // Rows saved before eye breaks existed lack the field.
  (v ?? NO_SESSIONS).map((s) => ({ ...s, eye_breaks: s.eye_breaks ?? 0 })),
);

export function saveSession(s: SessionSummary) {
  // Read storage directly: another tab may have saved its own session since this tab cached the list.
  const rest = (read<SessionSummary[]>(KEY.sessions) ?? []).filter((x) => x.id !== s.id);
  sessionsStore.set([s, ...rest].slice(0, MAX_SESSIONS));
}

export const loadSyncedAt = () => read<string>(KEY.syncedAt);
export const saveSyncedAt = (iso: string) => write(KEY.syncedAt, iso);

/** Everything this browser holds, for the user's own download. */
export function exportData() {
  return JSON.stringify(
    { exported_at: new Date().toISOString(), prefs: prefsStore.get(), sessions: sessionsStore.get() },
    null,
    2,
  );
}

export function clearAll() {
  try {
    Object.values(KEY).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

// Runs before first paint (see app/layout.tsx), so it must stay dependency-free.
export const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(KEY.theme)}));if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
