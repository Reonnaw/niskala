import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GOAL, byDay, dayScore, focusByBreaks, missions, painAverages, painByScore, streak, stressByBreaks, totals, who5DueOn, who5Score } from './insights.ts';
import type { Checkin, SessionSummary } from './store.ts';

const session = (started: Date, over: Partial<SessionSummary>): SessionSummary => ({
  id: crypto.randomUUID(),
  started_at: started.toISOString(),
  updated_at: started.toISOString(),
  active_s: 0,
  resets: 0,
  eye_breaks: 0,
  trainings: 0,
  breaths: 0,
  focus: 0,
  slouch_s: 0,
  low_blink_s: 0,
  late_s: 0,
  avg_blink: null,
  source: 'camera',
  ...over,
});

test('sessions group by local day and empty days are zero-filled', () => {
  const now = new Date(2026, 10, 20, 15, 0);
  const days = byDay(
    [
      session(new Date(2026, 10, 20, 9, 0), { active_s: 600, slouch_s: 60, avg_blink: 10 }),
      session(new Date(2026, 10, 20, 13, 0), { active_s: 1800, slouch_s: 300, avg_blink: 18, resets: 2 }),
      session(new Date(2026, 10, 18, 22, 0), { active_s: 900, late_s: 900 }),
      session(new Date(2026, 9, 1, 10, 0), { active_s: 999 }), // outside the window
    ],
    7,
    now,
  );
  assert.equal(days.length, 7);
  assert.equal(days[6].key, '2026-11-20');
  assert.equal(days[6].active_s, 2400);
  assert.equal(days[6].resets, 2);
  assert.equal(days[6].blink, 16); // (10*600 + 18*1800) / 2400
  assert.equal(days[4].late_s, 900);
  assert.equal(days[5].active_s, 0);
  assert.equal(days[5].blink, null);

  const t = totals(days);
  assert.equal(t.active_s, 3300);
  assert.equal(t.activeDays, 2);
  assert.ok(Math.abs(t.leanShare - 360 / 3300) < 1e-9);
});

test('totals are safe with no data', () => {
  const t = totals(byDay([], 14, new Date(2026, 0, 1)));
  assert.equal(t.leanShare, 0);
  assert.equal(t.blink, null);
});

test('a day scores from its tracked time only, and needs five tracked minutes', () => {
  const now = new Date(2026, 10, 20, 15, 0);
  const [timerOnly, camera] = byDay(
    [
      session(new Date(2026, 10, 19, 9, 0), { active_s: 3600, source: 'timer' }),
      session(new Date(2026, 10, 20, 9, 0), { active_s: 1200, slouch_s: 240, low_blink_s: 120 }),
      session(new Date(2026, 10, 20, 11, 0), { active_s: 3600, source: 'timer' }),
    ],
    2,
    now,
  );
  assert.equal(dayScore(timerOnly), null);
  // 20% leaning and 10% low blinking out of 20 tracked minutes: 100 * (1 - 0.15 - 0.025)
  assert.equal(camera.tracked_s, 1200);
  assert.equal(dayScore(camera), 83);
});

test('the streak counts goal days back from today without breaking on an unfinished today', () => {
  const now = new Date(2026, 10, 20, 9, 0);
  const good = (day: number) => session(new Date(2026, 10, day, 10, 0), { active_s: 1800, slouch_s: 60 });
  const bad = (day: number) => session(new Date(2026, 10, day, 10, 0), { active_s: 1800, slouch_s: 1500 });
  assert.ok(dayScore(byDay([good(20)], 1, now)[0])! >= GOAL);
  assert.equal(streak(byDay([bad(16), good(17), good(18), good(19)], 10, now)), 3);
  assert.equal(streak(byDay([good(17), good(18), good(19), good(20)], 10, now)), 4);
  assert.equal(streak(byDay([good(17), bad(19)], 10, now)), 0);
});

test('missions add up across the day and every one has to be met for a full day', () => {
  const now = new Date(2026, 10, 20, 18, 0);
  const morning = session(new Date(2026, 10, 20, 9, 0), { active_s: 1800, slouch_s: 120, eye_breaks: 2, resets: 1 });
  const [half] = byDay([morning], 1, now);
  assert.deepEqual(
    missions(half).map((m) => [m.id, m.done]),
    [['eye', false], ['reset', false], ['breath', false], ['train', false], ['score', true]],
  );
  const afternoon = session(new Date(2026, 10, 20, 14, 0), { active_s: 600, source: 'timer', eye_breaks: 1, resets: 1, trainings: 1, breaths: 1 });
  const days = byDay([morning, afternoon], 1, now);
  assert.ok(missions(days[0]).every((m) => m.done));
  assert.equal(totals(days).missionDays, 1);
  // Under five tracked minutes there is no score, so the score mission stays open.
  const [short] = byDay([session(new Date(2026, 10, 20, 9, 0), { active_s: 200, eye_breaks: 3, resets: 2, trainings: 1, breaths: 1 })], 1, now);
  assert.equal(missions(short).find((m) => m.id === 'score')!.done, false);
});

test('discomfort compares goal days with the rest only once each side has two days', () => {
  const now = new Date(2026, 10, 20, 20, 0);
  const at = (day: number, slouch: number) => session(new Date(2026, 10, day, 10, 0), { active_s: 1800, slouch_s: slouch });
  // 16 and 17 meet the goal, 18 and 19 do not, 20 has a check-in but no tracked time.
  const days = byDay([at(16, 60), at(17, 90), at(18, 1500), at(19, 1400)], 7, now);
  const c = (day: number, neck: number, back: number, eyes: number): Checkin => ({ day: `2026-11-${day}`, neck, back, eyes });
  const checkins = [c(16, 2, 1, 3), c(17, 1, 2, 3), c(18, 6, 5, 7), c(20, 9, 9, 9)];

  const early = painByScore(days, checkins);
  assert.equal(early.ready, false); // only one low day so far
  assert.equal(early.good.n, 2);
  assert.equal(early.good.mean, 2);

  const full = painByScore(days, [...checkins, c(19, 5, 4, 6)]);
  assert.equal(full.ready, true);
  assert.equal(full.low.mean, 5.5);

  const avg = painAverages(days, checkins);
  assert.equal(avg.n, 4);
  assert.equal(avg.neck, 4.5);
  assert.equal(painAverages(days.slice(0, 2), checkins).n, 0);
});

test('stress compares work days that took every break with the rest, skipping days off and check-ins without stress', () => {
  const now = new Date(2026, 10, 20, 20, 0);
  const work = (day: number, over: Partial<SessionSummary> = {}) => session(new Date(2026, 10, day, 10, 0), { active_s: 1800, ...over });
  const breaks = { eye_breaks: 3, resets: 2, breaths: 1 };
  // 14 and 15 took every break; 16 skipped the breathing pause, 17 took none; 18 had no work at all.
  const days = byDay([work(14, breaks), work(15, breaks), work(16, { eye_breaks: 3, resets: 2 }), work(17)], 7, now);
  const c = (day: number, stress?: number): Checkin => ({ day: `2026-11-${day}`, neck: 0, back: 0, eyes: 0, stress });
  const cmp = stressByBreaks(days, [c(14, 3), c(15, 4), c(16, 7), c(17, 8), c(18, 1)]);
  assert.equal(cmp.ready, true);
  assert.equal(cmp.good.mean, 3.5);
  assert.equal(cmp.low.mean, 7.5);
  assert.equal(cmp.low.n, 2); // the day off does not count

  // A check-in from before stress was asked has no stress value and is left out.
  assert.equal(stressByBreaks(days, [c(14, 3), c(15), c(16, 7), c(17, 8)]).ready, false);
  assert.equal(painAverages(days, [c(14, 3), c(15)]).stress, 3);
});

test('focus blocks add up per day and compare work days that took every break with the rest', () => {
  const now = new Date(2026, 10, 20, 20, 0);
  const work = (day: number, over: Partial<SessionSummary> = {}) => session(new Date(2026, 10, day, 10, 0), { active_s: 1800, ...over });
  const breaks = { eye_breaks: 3, resets: 2, breaths: 1 };
  // 14 and 15 took every break; 16 and 17 did not; 18 had no work at all.
  const sessions = [work(14, { ...breaks, focus: 2 }), work(14, { focus: 1 }), work(15, { ...breaks, focus: 4 }), work(16, { focus: 2 }), work(17)];
  const days = byDay(sessions, 7, now);
  assert.equal(days.find((d) => d.key === '2026-11-14')!.focus, 3);
  assert.equal(totals(days).focus, 9);

  const cmp = focusByBreaks(days);
  assert.equal(cmp.ready, true);
  assert.equal(cmp.good.mean, 3.5);
  assert.equal(cmp.low.mean, 1);
  assert.equal(cmp.low.n, 2); // the day off does not count
  assert.equal(focusByBreaks(days.filter((d) => d.key !== '2026-11-17')).ready, false);
});

test('WHO-5 scores 0 to 100 and comes due a week after the last one', () => {
  assert.equal(who5Score({ day: '2026-11-20', items: [5, 5, 5, 5, 5] }), 100);
  assert.equal(who5Score({ day: '2026-11-20', items: [2, 3, 2, 3, 2] }), 48);
  assert.equal(who5DueOn([], '2026-11-20'), '2026-11-20');
  const list = [{ day: '2026-11-27', items: [] }, { day: '2026-11-20', items: [] }];
  assert.equal(who5DueOn(list, '2026-11-28'), '2026-12-04'); // across a month end
});
