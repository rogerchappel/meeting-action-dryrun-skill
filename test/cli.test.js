import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseAttendees } from '../src/index.js';

const repoDir = new URL('..', import.meta.url);
const cliPath = fileURLToPath(new URL('../src/cli.js', import.meta.url));

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? repoDir,
    encoding: 'utf8'
  });
}

function withTemp(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-action-test-'));
  try { return fn(dir); } finally { fs.rmSync(dir, {recursive: true, force: true}); }
}

function write(dir, name, content) { const file = path.join(dir, name); fs.writeFileSync(file, content); return file; }

test('CLI writes fixture-backed dry-run artifacts', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-action-dryrun-'));
  const result = runCli(['--notes', 'fixtures/meeting.md', '--attendees', 'fixtures/attendees.json', '--out', outDir]);
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

for (const args of [[], ['--notes'], ['--notes', '--strict'], ['--notes', 'fixtures/meeting.md', '--attendees'], ['--notes', 'fixtures/meeting.md', '--out']]) {
  test(`CLI reports a usage error for missing values: ${args.join(' ') || '(none)'}`, () => {
    const result = runCli(args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^Error: /);
    assert.match(result.stderr, /Usage: meeting-action-dryrun/);
    assert.doesNotMatch(result.stderr, /TypeError|\n +at /);
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

test('parses and trims attendee names', () => withTemp((dir) => {const file = write(dir, 'attendees.json', JSON.stringify({attendees: [{name: ' Sam ', role: 'owner'}]}));assert.deepEqual(parseAttendees(file), [{name: 'Sam', role: 'owner'}]);}));

test('rejects malformed attendee documents without partial output or a stack trace', () => withTemp((dir) => {
  for (const [content, message] of [['{', 'expected valid JSON'], [JSON.stringify([]), 'expected an object'], [JSON.stringify({attendees: 'sam'}), 'expected an object'], [JSON.stringify({attendees: [{name: '  '}]}), 'non-empty name']]) {
    const attendees = write(dir, 'attendees.json', content);const notes = write(dir, 'notes.md', 'ACTION: prepare agenda');const out = path.join(dir, 'out');const result = runCli(['--notes', notes, '--attendees', attendees, '--out', out]);
    assert.equal(result.status, 1);assert.match(result.stderr, new RegExp(message));assert.doesNotMatch(result.stderr, /\n\s+at /);assert.equal(fs.existsSync(out), false);
  }
}));

test('does not overwrite a directly colliding notes input', () => withTemp((dir) => {const notes = write(dir, 'action-plan.json', 'ACTION: preserve me');const result = runCli(['--notes', notes, '--out', dir]);assert.equal(result.status, 1);assert.match(result.stderr, /collides/);assert.equal(fs.readFileSync(notes, 'utf8'), 'ACTION: preserve me');assert.equal(fs.existsSync(path.join(dir, 'review-brief.md')), false);}));

test('does not overwrite an input through a path alias', () => withTemp((dir) => {const real = path.join(dir, 'real');fs.mkdirSync(real);const alias = path.join(dir, 'alias');fs.symlinkSync(real, alias, 'dir');const attendees = write(real, 'review-brief.md', JSON.stringify({attendees: []}));const result = runCli(['--notes', write(dir, 'notes.md', 'ACTION: test alias'), '--attendees', attendees, '--out', alias]);assert.equal(result.status, 1);assert.match(result.stderr, /collides/);assert.equal(fs.readFileSync(attendees, 'utf8'), JSON.stringify({attendees: []}));assert.equal(fs.existsSync(path.join(real, 'action-plan.json')), false);}));
