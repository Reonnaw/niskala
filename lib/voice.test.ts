import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { allLines, clipOf } from './voice.ts';

test('every spoken line has a recording (run `npm run voice` after adding or editing one)', () => {
  assert.deepEqual(
    allLines().filter((t) => !existsSync(`public${clipOf(t)}`)),
    [],
  );
});
