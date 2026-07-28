import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoDir = new URL('..', import.meta.url);
const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? repoDir,
    encoding: 'utf8'
  });
}

test('CLI writes fixture-backed dry-run artifacts', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-action-dryrun-'));
  const result = runCli([
    '--notes',
    'fixtures/meeting.md',
    '--attendees',
    'fixtures/attendees.json',
    '--out',
    outDir
  ]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Wrote .*action-plan\.json/);
  assert.ok(fs.existsSync(path.join(outDir, 'action-plan.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'review-brief.md')));
});

test('CLI help exits cleanly with usage text', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: meeting-action-dryrun/);
});

for (const args of [
  [],
  ['--notes'],
  ['--notes', '--strict'],
  ['--notes', 'fixtures/meeting.md', '--attendees'],
  ['--notes', 'fixtures/meeting.md', '--out']
]) {
  test(`CLI reports a usage error for missing values: ${args.join(' ') || '(none)'}`, () => {
    const result = runCli(args);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /^Error: /);
    assert.match(result.stderr, /Usage: meeting-action-dryrun/);
    assert.doesNotMatch(result.stderr, /TypeError|\\n +at /);
  });
}

test('CLI rejects unknown options', () => {
  const result = runCli(['--notes', 'fixtures/meeting.md', '--output', 'tmp']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Error: Unknown option: --output/);
  assert.match(result.stderr, /Usage: meeting-action-dryrun/);
});

test('CLI uses meeting-action-out when --out is omitted', () => {
  const workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-action-default-out-'));
  const notesFile = fileURLToPath(new URL('../fixtures/meeting.md', import.meta.url));
  const result = runCli(['--notes', notesFile], { cwd: workingDir });
  const outDir = path.join(workingDir, 'meeting-action-out');

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Wrote meeting-action-out\/action-plan\.json/);
  assert.ok(fs.existsSync(path.join(outDir, 'action-plan.json')));
  assert.ok(fs.existsSync(path.join(outDir, 'review-brief.md')));
});
