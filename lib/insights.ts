import type { Checkin, SessionSummary, Who5 } from './store';

export type Day = {
  key: string; // local YYYY-MM-DD
  date: Date;
  active_s: number;
  tracked_s: number; // active time with posture measured (camera or demo, not timer)
  slouch_s: number;
  low_blink_s: number;
  late_s: number;
  resets: number;
  eye_breaks: number;
  trainings: number;
  breaths: number;
  focus: number; // focus blocks finished
  blink: number | null; // active-time weighted mean
};

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The last `count` local days ending today, oldest first, with days that have no sessions as zeros. */
export function byDay(sessions: SessionSummary[], count: number, now: Date): Day[] {
  const days: Day[] = [];
  const index = new Map<string, Day & { blinkW: number; blinkT: number }>();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const d = { key: dayKey(date), date, active_s: 0, tracked_s: 0, slouch_s: 0, low_blink_s: 0, late_s: 0, resets: 0, eye_breaks: 0, trainings: 0, breaths: 0, focus: 0, blink: null, blinkW: 0, blinkT: 0 };
    index.set(d.key, d);
    days.push(d);
  }
  for (const s of sessions) {
    const d = index.get(dayKey(new Date(s.started_at)));
    if (!d) continue;
    d.active_s += s.active_s;
    if (s.source !== 'timer') d.tracked_s += s.active_s;
    d.slouch_s += s.slouch_s;
    d.low_blink_s += s.low_blink_s;
    d.late_s += s.late_s;
    d.resets += s.resets;
    d.eye_breaks += s.eye_breaks;
    d.trainings += s.trainings;
    d.breaths += s.breaths;
    d.focus += s.focus;
    if (s.avg_blink !== null) {
      d.blinkW += s.avg_blink * s.active_s;
      d.blinkT += s.active_s;
    }
  }
  return days.map((d) => {
    const { blinkW, blinkT, ...rest } = index.get(d.key)!;
    return { ...rest, blink: blinkT > 0 ? blinkW / blinkT : null };
  });
}

export const GOAL = 70;
const MIN_TRACKED_S = 300;

/** 0-100 from the tracked time spent upright (three quarters) and blinking normally (one quarter); null under five tracked minutes. */
export function dayScore(d: Day) {
  if (d.tracked_s < MIN_TRACKED_S) return null;
  const lean = Math.min(1, d.slouch_s / d.tracked_s);
  const dry = Math.min(1, d.low_blink_s / d.tracked_s);
  return Math.round(100 * (1 - 0.75 * lean - 0.25 * dry));
}

/** Days in a row that met the goal, counting back from today; today only adds, it never breaks the run while it is still going. */
export function streak(days: Day[]) {
  let n = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const s = dayScore(days[i]);
    if (s !== null && s >= GOAL) n++;
    else if (i < days.length - 1) break;
  }
  return n;
}

export type MissionId = 'eye' | 'reset' | 'breath' | 'train' | 'score';
export type Mission = { id: MissionId; label: string; have: number; need: number; done: boolean };

/** A small daily checklist that ties the breaks, the breathing pause, posture training and the score together. */
export function missions(d: Day): Mission[] {
  const list = [
    { id: 'eye' as const, label: 'Istirahat mata 3 kali', have: d.eye_breaks, need: 3 },
    { id: 'reset' as const, label: 'Stretching 2 kali', have: d.resets, need: 2 },
    { id: 'breath' as const, label: 'Jeda napas sekali', have: d.breaths, need: 1 },
    { id: 'train' as const, label: 'Latihan postur sekali', have: d.trainings, need: 1 },
    { id: 'score' as const, label: `Skor ${GOAL} ke atas`, have: dayScore(d) ?? 0, need: GOAL },
  ];
  return list.map((m) => ({ ...m, done: m.have >= m.need }));
}

export const missionsDone = (d: Day) => missions(d).filter((m) => m.done).length;

const BREAKS: MissionId[] = ['eye', 'reset', 'breath'];
/** Every break mission met: the eye breaks, the stretching and the breathing pause. */
export const enoughBreaks = (d: Day) => missions(d).every((m) => m.done || !BREAKS.includes(m.id));

export function totals(days: Day[]) {
  const sum = (f: (d: Day) => number) => days.reduce((a, d) => a + f(d), 0);
  const active = sum((d) => d.active_s);
  const withBlink = days.filter((d) => d.blink !== null);
  return {
    active_s: active,
    slouch_s: sum((d) => d.slouch_s),
    leanShare: active > 0 ? sum((d) => d.slouch_s) / active : 0,
    late_s: sum((d) => d.late_s),
    resets: sum((d) => d.resets),
    eye_breaks: sum((d) => d.eye_breaks),
    trainings: sum((d) => d.trainings),
    breaths: sum((d) => d.breaths),
    focus: sum((d) => d.focus),
    missionDays: days.filter((d) => missions(d).every((m) => m.done)).length,
    activeDays: days.filter((d) => d.active_s > 0).length,
    blink: withBlink.length
      ? withBlink.reduce((a, d) => a + d.blink! * d.active_s, 0) / withBlink.reduce((a, d) => a + d.active_s, 0)
      : null,
  };
}

/** The mean of the three areas, so one number can sit on a day. */
export const painOf = (c: Checkin) => (c.neck + c.back + c.eyes) / 3;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * A value of each day, or of its check-in, on days that are on one side of a split against days on the other, over
 * the given days. Only days the split applies to (`side` not null) and with that value count, and each side needs two
 * of them before the comparison means anything.
 */
function compare(days: Day[], checkins: Checkin[], side: (d: Day) => boolean | null, value: (d: Day, c: Checkin | undefined) => number | undefined) {
  const byDay = new Map(checkins.map((c) => [c.day, c]));
  const good: number[] = [];
  const low: number[] = [];
  for (const d of days) {
    const v = value(d, byDay.get(d.key));
    const s = side(d);
    if (v === undefined || s === null) continue;
    (s ? good : low).push(v);
  }
  const ready = good.length >= 2 && low.length >= 2;
  return { good: { n: good.length, mean: mean(good) }, low: { n: low.length, mean: mean(low) }, ready };
}

/** Discomfort on days that met the score goal against days that did not. */
export const painByScore = (days: Day[], checkins: Checkin[]) =>
  compare(days, checkins, (d) => { const s = dayScore(d); return s === null ? null : s >= GOAL; }, (_, c) => c && painOf(c));

/** Stress on work days that took every break mission against work days that did not. */
export const stressByBreaks = (days: Day[], checkins: Checkin[]) =>
  compare(days, checkins, (d) => (d.active_s > 0 ? enoughBreaks(d) : null), (_, c) => c?.stress);

/** Focus blocks finished on work days that took every break mission against work days that did not. */
export const focusByBreaks = (days: Day[]) => compare(days, [], (d) => (d.active_s > 0 ? enoughBreaks(d) : null), (d) => d.focus);

/** Each area's mean, and stress, over the check-ins that fall on the given days, or null with none. */
export function painAverages(days: Day[], checkins: Checkin[]) {
  const keys = new Set(days.map((d) => d.key));
  const inRange = checkins.filter((c) => keys.has(c.day));
  return {
    n: inRange.length,
    neck: mean(inRange.map((c) => c.neck)),
    back: mean(inRange.map((c) => c.back)),
    eyes: mean(inRange.map((c) => c.eyes)),
    stress: mean(inRange.flatMap((c) => c.stress ?? [])),
  };
}

/** WHO-5 Well-Being Index: the five answers summed and multiplied by four, 0 (worst) to 100 (best). */
export const who5Score = (w: Who5) => w.items.reduce((a, b) => a + b, 0) * 4;
/** Under 50 is the questionnaire's own cut-off for suggesting a talk with someone. */
export const WHO5_LOW = 50;
export const WHO5_EVERY_DAYS = 7;

/** The local day the next WHO-5 is due: today with none yet, else a week after the newest one. */
export function who5DueOn(list: Who5[], today: string) {
  const last = list.reduce<string | null>((a, w) => (a === null || w.day > a ? w.day : a), null);
  if (last === null) return today;
  const [y, m, d] = last.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + WHO5_EVERY_DAYS));
}
