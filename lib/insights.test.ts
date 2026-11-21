import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GOAL, byDay, dayScore, streak, totals } from './insights.ts';
import type { SessionSummary } from './store.ts';

const session = (started: Date, over: Partial<SessionSummary>): SessionSummary => ({
  id: crypto.randomUUID(),
  started_at: started.toISOString(),
  updated_at: started.toISOString(),
  active_s: 0,
  resets: 0,
  eye_breaks: 0,
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
