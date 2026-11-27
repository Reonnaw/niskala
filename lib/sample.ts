// Two weeks of made-up sessions and check-ins, so Riwayat and the coach can be tried in a browser that has none.
import { dayKey } from './insights.ts';
import { SAMPLE_ID, type Checkin, type SessionSummary } from './store.ts';

type Breaks = 'all' | 'some' | 'none';
// Oldest first, ending yesterday. Hours of work (0 = a day off), breaks taken, share of time leaning, minutes past
// bedtime, and the evening's check-in. Days with every break run calmer, but not on every single day, and the last
// four meet the score goal, so the streak has something to show. Days with every break finish as many focus blocks or
// more, so the breaks cost no work.
const DAYS: { h: number; breaks: Breaks; lean: number; late: number; check?: [neck: number, back: number, eyes: number, stress: number] }[] = [
  { h: 4, breaks: 'some', lean: 0.42, late: 40, check: [5, 4, 6, 7] },
  { h: 3.5, breaks: 'all', lean: 0.22, late: 0, check: [2, 1, 3, 2] },
  { h: 2.5, breaks: 'none', lean: 0.48, late: 25, check: [6, 5, 5, 6] },
  { h: 0, breaks: 'none', lean: 0, late: 0, check: [1, 1, 1, 2] },
  { h: 3, breaks: 'all', lean: 0.2, late: 0, check: [3, 2, 3, 4] },
  { h: 4, breaks: 'some', lean: 0.35, late: 55, check: [6, 6, 7, 8] },
  { h: 3.5, breaks: 'none', lean: 0.5, late: 0, check: [7, 5, 6, 6] },
  { h: 0, breaks: 'none', lean: 0, late: 0 },
  { h: 3.5, breaks: 'some', lean: 0.4, late: 20, check: [5, 4, 6, 7] },
  { h: 3, breaks: 'all', lean: 0.25, late: 10, check: [3, 3, 4, 5] },
  { h: 4, breaks: 'some', lean: 0.3, late: 30, check: [4, 3, 5, 5] },
  { h: 2, breaks: 'all', lean: 0.15, late: 0, check: [1, 1, 2, 3] },
  { h: 3, breaks: 'all', lean: 0.2, late: 0, check: [2, 2, 3, 3] },
];

const BREAKS: Record<Breaks, Pick<SessionSummary, 'eye_breaks' | 'resets' | 'breaths' | 'trainings' | 'focus'>> = {
  all: { eye_breaks: 3, resets: 2, breaths: 1, trainings: 1, focus: 4 },
  some: { eye_breaks: 3, resets: 1, breaths: 0, trainings: 0, focus: 3 },
  none: { eye_breaks: 1, resets: 0, breaths: 0, trainings: 0, focus: 3 },
};
const NO_BREAKS = { eye_breaks: 0, resets: 0, breaths: 0, trainings: 0, focus: 0 };

/** The sample for the days before `now`: sessions with ids starting with SAMPLE_ID, check-ins, and every day it covers. */
export function sampleData(now: Date) {
  const sessions: SessionSummary[] = [];
  const checkins: Checkin[] = [];
  const days: string[] = [];
  DAYS.forEach((d, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS.length - i));
    const day = dayKey(date);
    days.push(day);
    if (d.check) {
      const [neck, back, eyes, stress] = d.check;
      checkins.push({ day, neck, back, eyes, stress });
    }
    if (d.h === 0) return;
    const session = (part: string, hour: number, active: number, late: number, breaks: typeof NO_BREAKS): SessionSummary => {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 40).toISOString();
      return {
        id: `${SAMPLE_ID}${day}-${part}`,
        started_at: start,
        updated_at: start,
        active_s: active,
        ...breaks,
        slouch_s: Math.round(active * d.lean),
        low_blink_s: Math.round(active * 0.1),
        late_s: late,
        avg_blink: d.breaks === 'all' ? 15 : 11,
        source: 'camera',
      };
    };
    sessions.push(session('kerja', 8, d.h * 3600, 0, BREAKS[d.breaks]));
    // A late night is its own short session after bedtime, with no breaks in it.
    if (d.late > 0) sessions.push(session('malam', 22, (d.late + 20) * 60, d.late * 60, NO_BREAKS));
  });
  // Newest first, like the sessions store.
  return { sessions: sessions.reverse(), checkins: checkins.reverse(), days };
}
