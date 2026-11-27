import assert from 'node:assert/strict';
import { test } from 'node:test';
import { byDay, dayKey, focusByBreaks, painByScore, streak, stressByBreaks } from './insights.ts';
import { sampleData } from './sample.ts';
import { SAMPLE_ID } from './store.ts';

test('the sample fills Riwayat with comparisons that are ready, all on days before today', () => {
  const now = new Date(2026, 11, 3, 15, 0);
  const { sessions, checkins, days: covered } = sampleData(now);
  const days = byDay(sessions, 14, now);

  const stress = stressByBreaks(days, checkins);
  assert.ok(stress.ready);
  assert.ok(stress.good.mean! < stress.low.mean!);
  assert.ok(painByScore(days, checkins).ready);
  const focus = focusByBreaks(days);
  assert.ok(focus.ready);
  assert.ok(focus.good.mean! >= focus.low.mean!);
  assert.equal(streak(days), 4);

  assert.ok(sessions.every((s) => s.id.startsWith(SAMPLE_ID)));
  assert.ok(!covered.includes(dayKey(now)));
  assert.ok(checkins.every((c) => covered.includes(c.day)));
  // Every sample day shows in Riwayat's default 14-day range.
  assert.ok(covered.every((k) => days.some((d) => d.key === k)));
});
