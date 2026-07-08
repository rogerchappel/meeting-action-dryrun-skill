import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

test('CLI writes fixture-backed dry-run artifacts', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-action-dryrun-'));
  const result = spawnSync(process.execPath, [
    'src/cli.js',
    '--notes',
    'fixtures/meeting.md',
    '--attendees',
    'fixtures/attendees.json',
    '--out',
    outDir
  ], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Wrote .*action-plan\.json/);
  assert.ok(fs.existsSync(path.join(outDir, 'action-plan.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'review-brief.md')));
});

test('CLI help exits cleanly with usage text', () => {
  const result = spawnSync(process.execPath, ['src/cli.js', '--help'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: meeting-action-dryrun/);
});
