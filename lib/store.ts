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
  focusMin: 25 | 50; // length of one focus block
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
  focusMin: 25,
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
  trainings: number; // posture trainings finished
  breaths: number; // breathing pauses finished
  focus: number; // focus blocks finished
  slouch_s: number;
  low_blink_s: number;
  late_s: number;
  avg_blink: number | null;
  source: 'camera' | 'timer' | 'simulation';
};

/** How sore and how stressed one evening felt, 0 (not at all) to 10 (as bad as it gets). Check-ins saved before stress was asked lack it. */
export type Checkin = { day: string; neck: number; back: number; eyes: number; stress?: number };

/** The five WHO-5 answers of one week, each 0 (at no time) to 5 (all of the time), in the questionnaire's order. */
export type Who5 = { day: string; items: number[] };

const KEY = {
  prefs: 'niskala:prefs',
  baseline: 'niskala:baseline',
  baselineSide: 'niskala:baseline-side',
  sessions: 'niskala:sessions',
  syncedAt: 'niskala:synced-at',
  theme: 'niskala:theme',
  coach: 'niskala:coach',
  checkins: 'niskala:checkins',
  who5: 'niskala:who5',
  sample: 'niskala:sample',
};
const MAX_SESSIONS = 200;
const MAX_CHECKINS = 366;

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
  // Rows saved before eye breaks, trainings, breathing pauses or focus blocks were counted lack the field.
  (v ?? NO_SESSIONS).map((s) => ({ ...s, eye_breaks: s.eye_breaks ?? 0, trainings: s.trainings ?? 0, breaths: s.breaths ?? 0, focus: s.focus ?? 0 })),
);

export function saveSession(s: SessionSummary) {
  // Read storage directly: another tab may have saved its own session since this tab cached the list.
  const rest = (read<SessionSummary[]>(KEY.sessions) ?? []).filter((x) => x.id !== s.id);
  sessionsStore.set([s, ...rest].slice(0, MAX_SESSIONS));
}

// Health data, so it never leaves this browser: sync.ts does not read it.
const NO_CHECKINS: Checkin[] = [];
export const checkinsStore = stored<Checkin[]>(KEY.checkins, NO_CHECKINS);

/** One check-in per local day; a second one the same day replaces the first. */
export function saveCheckin(c: Checkin) {
  const rest = (read<Checkin[]>(KEY.checkins) ?? []).filter((x) => x.day !== c.day);
  checkinsStore.set([c, ...rest].slice(0, MAX_CHECKINS));
}

// Also health data, kept like the check-ins: never synced, never sent to the coach.
const NO_WHO5: Who5[] = [];
export const who5Store = stored<Who5[]>(KEY.who5, NO_WHO5);

/** Newest first; a second one the same day replaces the first. */
export function saveWho5(w: Who5) {
  const rest = (read<Who5[]>(KEY.who5) ?? []).filter((x) => x.day !== w.day);
  who5Store.set([w, ...rest].slice(0, MAX_CHECKINS));
}

/** Sample sessions carry this id prefix, so clearing them never touches a real one. */
export const SAMPLE_ID = 'contoh-';
// The days the sample covers while it is loaded, or null.
export const sampleStore = stored<string[] | null>(KEY.sample, null);

/** Fills a browser that has no data yet with sample sessions and check-ins, so Riwayat can be tried at once. */
export function loadSample({ sessions, checkins, days }: { sessions: SessionSummary[]; checkins: Checkin[]; days: string[] }) {
  sessionsStore.set(sessions);
  checkinsStore.set(checkins);
  sampleStore.set(days);
}

/** Removes the sample and the coaching asked about it; sessions and check-ins recorded since stay. */
export function clearSample() {
  const days = new Set(read<string[]>(KEY.sample) ?? []);
  sessionsStore.set((read<SessionSummary[]>(KEY.sessions) ?? []).filter((s) => !s.id.startsWith(SAMPLE_ID)));
  checkinsStore.set((read<Checkin[]>(KEY.checkins) ?? []).filter((c) => !days.has(c.day)));
  coachStore.set(null);
  sampleStore.set(null);
}

export const loadSyncedAt = () => read<string>(KEY.syncedAt);
export const saveSyncedAt = (iso: string) => write(KEY.syncedAt, iso);

/** Everything this browser holds, for the user's own download. */
export function exportData() {
  return JSON.stringify(
    { exported_at: new Date().toISOString(), prefs: prefsStore.get(), sessions: sessionsStore.get(), checkins: checkinsStore.get(), who5: who5Store.get() },
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
