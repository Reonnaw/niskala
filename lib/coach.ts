// The weekly coach: the rounded numbers that leave the device, the prompt built from them, and the shape of the reply.
import { GOAL, dayScore, type Day } from './insights.ts';

export type Week = {
  days: number;
  activeMin: number;
  trackedMin: number;
  leanPct: number;
  lowBlinkPct: number;
  avgBlink: number | null;
  stretchBreaks: number;
  eyeBreaks: number;
  lateMin: number;
  avgScore: number | null;
  streak: number;
  perDay: { day: string; score: number | null; activeMin: number; leanPct: number }[];
};
export type Coach = { headline: string; tips: { title: string; body: string }[] };

const toMin = (s: number) => Math.round(s / 60);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((100 * part) / whole) : 0);
const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Seven days of totals in whole minutes and percents: everything the coach ever sees. */
export function weekSummary(days: Day[], streak: number): Week {
  const sum = (f: (d: Day) => number) => days.reduce((a, d) => a + f(d), 0);
  const tracked = sum((d) => d.tracked_s);
  return {
    days: days.filter((d) => d.active_s > 0).length,
    activeMin: toMin(sum((d) => d.active_s)),
    trackedMin: toMin(tracked),
    leanPct: pct(sum((d) => d.slouch_s), tracked),
    lowBlinkPct: pct(sum((d) => d.low_blink_s), tracked),
    avgBlink: mean(days.flatMap((d) => (d.blink === null ? [] : [d.blink]))),
    stretchBreaks: sum((d) => d.resets),
    eyeBreaks: sum((d) => d.eye_breaks),
    lateMin: toMin(sum((d) => d.late_s)),
    avgScore: mean(days.flatMap((d) => dayScore(d) ?? [])),
    streak,
    perDay: days.map((d) => ({
      day: d.date.toLocaleDateString('id-ID', { weekday: 'short' }),
      score: dayScore(d),
      activeMin: toMin(d.active_s),
      leanPct: pct(d.slouch_s, d.tracked_s),
    })),
  };
}

const isInt = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
const intOrNull = (v: unknown, max: number) => v === null || isInt(v, max);
const WEEK_MIN = 7 * 1440;

/**
 * Checks a week sent by a browser and rebuilds it from the checked fields only, so nothing else in the
 * request body can reach the prompt.
 */
export function parseWeek(v: unknown): Week | null {
  if (!v || typeof v !== 'object') return null;
  const w = v as Record<string, unknown>;
  const limits = { days: 7, activeMin: WEEK_MIN, trackedMin: WEEK_MIN, leanPct: 100, lowBlinkPct: 100, stretchBreaks: 500, eyeBreaks: 500, lateMin: WEEK_MIN, streak: 366 };
  if (!Object.entries(limits).every(([k, max]) => isInt(w[k], max))) return null;
  if (!intOrNull(w.avgBlink, 120) || !intOrNull(w.avgScore, 100)) return null;
  if (!Array.isArray(w.perDay) || w.perDay.length > 7) return null;
  const perDay: Week['perDay'] = [];
  for (const x of w.perDay as Record<string, unknown>[]) {
    // Short weekday names only ("Sen", "Kam"), so the field cannot carry instructions.
    if (!x || typeof x.day !== 'string' || !/^\p{L}{2,4}\.?$/u.test(x.day)) return null;
    if (!intOrNull(x.score, 100) || !isInt(x.activeMin, 1440) || !isInt(x.leanPct, 100)) return null;
    perDay.push({ day: x.day, score: x.score as number | null, activeMin: x.activeMin, leanPct: x.leanPct });
  }
  const n = (k: keyof typeof limits) => w[k] as number;
  return {
    days: n('days'),
    activeMin: n('activeMin'),
    trackedMin: n('trackedMin'),
    leanPct: n('leanPct'),
    lowBlinkPct: n('lowBlinkPct'),
    avgBlink: w.avgBlink as number | null,
    stretchBreaks: n('stretchBreaks'),
    eyeBreaks: n('eyeBreaks'),
    lateMin: n('lateMin'),
    avgScore: w.avgScore as number | null,
    streak: n('streak'),
    perDay,
  };
}

export function coachPrompt(week: Week) {
  return [
    'Kamu coach ergonomi yang ramah buat orang yang kerja lama di depan laptop. Ini ringkasan 7 hari terakhir dari aplikasi Niskala:',
    JSON.stringify(week),
    `Artinya: leanPct = persen waktu bungkuk atau miring, lowBlinkPct = persen waktu kedipan di bawah 10 per menit, avgBlink = kedipan per menit, lateMin = menit di depan layar lewat jam tidur, score 0 sampai 100 dengan target ${GOAL}, streak = hari beruntun mencapai target. score null artinya hari itu postur nggak dicek.`,
    'Tulis dalam bahasa Indonesia santai (pakai "kamu", boleh "nggak"), tanpa istilah medis berat dan tanpa diagnosis. Sebut periodenya "minggu ini".',
    'headline: satu kalimat yang merangkum minggu ini dengan angka yang paling penting.',
    'tips: tepat 3 saran yang spesifik ke angka di atas. Masing-masing title pendek (maksimal 6 kata) dan body 1 sampai 2 kalimat yang bisa langsung dicoba besok. Kalau cocok, sarankan fitur Niskala: Latihan postur 2 menit, Cek setup meja, stretching 60 detik, istirahat mata 20 detik, atau layar hangat menjelang jam tidur.',
  ].join('\n');
}

/** The reply as JSON with a headline and exactly three tips of sensible length, or null. */
export function parseCoach(text: string): Coach | null {
  try {
    const c = JSON.parse(text) as Coach;
    const ok = (s: unknown, max: number) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
    if (!ok(c.headline, 400) || !Array.isArray(c.tips) || c.tips.length !== 3) return null;
    if (!c.tips.every((t) => ok(t?.title, 120) && ok(t?.body, 600))) return null;
    return { headline: c.headline.trim(), tips: c.tips.map((t) => ({ title: t.title.trim(), body: t.body.trim() })) };
  } catch {
    return null;
  }
}
