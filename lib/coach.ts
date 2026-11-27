// The weekly coach: the rounded numbers that leave the device, the prompt built from them, and the shape of the reply.
import { GOAL, dayScore, missions, painAverages, type Day } from './insights.ts';
import type { Checkin } from './store.ts';

export type Week = {
  days: number;
  activeMin: number;
  trackedMin: number;
  leanPct: number;
  lowBlinkPct: number;
  avgBlink: number | null;
  stretchBreaks: number;
  eyeBreaks: number;
  trainings: number;
  breaths: number;
  missionDays: number;
  checkinDays: number;
  neckPain: number | null;
  backPain: number | null;
  eyePain: number | null;
  stress: number | null;
  lateMin: number;
  avgScore: number | null;
  streak: number;
  perDay: { day: string; score: number | null; activeMin: number; leanPct: number }[];
};
export type Coach = { headline: string; tips: { title: string; body: string }[] };

const toMin = (s: number) => Math.round(s / 60);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((100 * part) / whole) : 0);
const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

const round = (v: number | null) => (v === null ? null : Math.round(v));

/** Seven days of totals in whole minutes and percents, and rounded discomfort and stress: everything the coach ever sees. */
export function weekSummary(days: Day[], streak: number, checkins: Checkin[] = []): Week {
  const sum = (f: (d: Day) => number) => days.reduce((a, d) => a + f(d), 0);
  const tracked = sum((d) => d.tracked_s);
  const pain = painAverages(days, checkins);
  return {
    days: days.filter((d) => d.active_s > 0).length,
    activeMin: toMin(sum((d) => d.active_s)),
    trackedMin: toMin(tracked),
    leanPct: pct(sum((d) => d.slouch_s), tracked),
    lowBlinkPct: pct(sum((d) => d.low_blink_s), tracked),
    avgBlink: mean(days.flatMap((d) => (d.blink === null ? [] : [d.blink]))),
    stretchBreaks: sum((d) => d.resets),
    eyeBreaks: sum((d) => d.eye_breaks),
    trainings: sum((d) => d.trainings),
    breaths: sum((d) => d.breaths),
    missionDays: days.filter((d) => missions(d).every((m) => m.done)).length,
    checkinDays: pain.n,
    neckPain: round(pain.neck),
    backPain: round(pain.back),
    eyePain: round(pain.eyes),
    stress: round(pain.stress),
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
  const limits = { days: 7, activeMin: WEEK_MIN, trackedMin: WEEK_MIN, leanPct: 100, lowBlinkPct: 100, stretchBreaks: 500, eyeBreaks: 500, trainings: 500, breaths: 500, missionDays: 7, lateMin: WEEK_MIN, streak: 366 };
  if (!Object.entries(limits).every(([k, max]) => isInt(w[k], max))) return null;
  if (!intOrNull(w.avgBlink, 120) || !intOrNull(w.avgScore, 100)) return null;
  if (!isInt(w.checkinDays, 7) || !['neckPain', 'backPain', 'eyePain', 'stress'].every((k) => intOrNull(w[k], 10))) return null;
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
    trainings: n('trainings'),
    breaths: n('breaths'),
    missionDays: n('missionDays'),
    checkinDays: w.checkinDays as number,
    neckPain: w.neckPain as number | null,
    backPain: w.backPain as number | null,
    eyePain: w.eyePain as number | null,
    stress: w.stress as number | null,
    lateMin: n('lateMin'),
    avgScore: w.avgScore as number | null,
    streak: n('streak'),
    perDay,
  };
}

export function coachPrompt(week: Week) {
  return [
    'Kamu coach kesejahteraan kerja yang ramah buat orang yang kerja lama di depan laptop: postur, mata, jeda, tidur, dan stres. Ini ringkasan 7 hari terakhir dari aplikasi Niskala:',
    JSON.stringify(week),
    `Artinya: leanPct = persen waktu bungkuk atau miring, lowBlinkPct = persen waktu kedipan di bawah 10 per menit, avgBlink = kedipan per menit, lateMin = menit di depan layar lewat jam tidur, score 0 sampai 100 dengan target ${GOAL}, streak = hari beruntun mencapai target, trainings = berapa kali Latihan postur 2 menit diselesaikan, breaths = berapa kali Jeda napas 1 menit diselesaikan, missionDays = hari yang semua misi hariannya beres (istirahat mata 3 kali, stretching 2 kali, jeda napas sekali, latihan postur sekali, skor ${GOAL} ke atas). score null artinya hari itu postur nggak dicek. neckPain, backPain, eyePain = rata-rata pegal yang kamu isi sendiri di leher dan bahu, punggung, dan mata, skala 0 (nggak pegal) sampai 10 (pegal banget), dari checkinDays hari; null artinya belum diisi. stress = rata-rata stres yang kamu isi sendiri, skala 0 (santai) sampai 10 (stres berat); null artinya belum diisi.`,
    'Tulis dalam bahasa Indonesia santai (pakai "kamu", boleh "nggak"), tanpa istilah medis berat dan tanpa diagnosis. Sebut periodenya "minggu ini".',
    'headline: satu kalimat yang merangkum minggu ini dengan angka yang paling penting.',
    'Kalau ada angka pegal, kaitkan saran dengan bagian yang paling pegal (misalnya mata yang pegal dengan kedipan, leher dengan bungkuk). Kalau pegalnya 7 ke atas, sarankan juga periksa ke dokter atau fisioterapis, tanpa nakut-nakutin.',
    'Kalau stress ada, satu dari tiga saran harus soal stres, dikaitkan ke kebiasaan kerja di angka (jeda yang dilewatin, jeda napas, kerja lewat jam tidur). Jangan nebak penyebab stresnya, jangan nyebut kondisi atau gangguan mental apa pun. Kalau stress 7 ke atas, ajak juga cerita ke orang yang dipercaya atau ke Healing119 (telepon 119 ext 8, gratis, 24 jam), tanpa nakut-nakutin.',
    'tips: tepat 3 saran yang spesifik ke angka di atas. Masing-masing title pendek (maksimal 6 kata) dan body 1 sampai 2 kalimat yang bisa langsung dicoba besok. Kalau cocok, sarankan fitur Niskala: Latihan postur 2 menit, Jeda napas 1 menit, Cek setup meja, stretching 60 detik, istirahat mata 20 detik, atau layar hangat menjelang jam tidur.',
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
