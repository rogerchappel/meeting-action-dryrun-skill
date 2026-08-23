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

test('CLI writes byte-stable artifacts for identical inputs', () => withTemp((dir) => {
  const first = path.join(dir, 'first');
  const second = path.join(dir, 'second');
  for (const out of [first, second]) {
    const result = runCli(['--notes', 'fixtures/meeting.md', '--attendees', 'fixtures/attendees.json', '--out', out]);
    assert.equal(result.status, 0);
  }
  for (const artifact of ['action-plan.json', 'review-brief.md']) {
    assert.deepEqual(fs.readFileSync(path.join(first, artifact)), fs.readFileSync(path.join(second, artifact)));
  }
}));

test('CLI records an explicit generation timestamp', () => withTemp((dir) => {
  const generatedAt = '2026-08-11T02:08:00.000Z';
  const result = runCli(['--notes', 'fixtures/meeting.md', '--generated-at', generatedAt, '--out', dir]);
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'action-plan.json'), 'utf8')).generatedAt, generatedAt);
}));

test('CLI rejects unsupported generation timestamp forms without partial output', () => withTemp((dir) => {
  for (const generatedAt of ['2026', '2026-08-11', 'Mon, 11 Aug 2026 02:08:00 GMT']) {
    const out = path.join(dir, generatedAt.replace(/\W/g, '-'));
    const result = runCli(['--notes', 'fixtures/meeting.md', '--generated-at', generatedAt, '--out', out]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected an ISO-8601 timestamp/);
    assert.equal(fs.existsSync(out), false);
  }
}));

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

test('CLI reports a missing owner instead of matching an attendee substring', () => withTemp((dir) => {
  const notes = write(dir, 'notes.md', 'ACTION: Finish planning review');
  const attendees = write(dir, 'attendees.json', JSON.stringify({attendees: [{name: 'Ann'}]}));
  const out = path.join(dir, 'out');
  const result = runCli(['--notes', notes, '--attendees', attendees, '--out', out]);
  assert.equal(result.status, 0);
  const plan = JSON.parse(fs.readFileSync(path.join(out, 'action-plan.json'), 'utf8'));
  assert.equal(plan.actions[0].owner, null);
  assert.equal(plan.actions[0].approvalRequired, true);
  assert.deepEqual(plan.issues, [{id: 'action-1', severity: 'warning', message: 'Missing owner'}]);
  const strict = runCli(['--notes', notes, '--attendees', attendees, '--out', out, '--strict']);
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /Missing owner/);
}));

test('CLI distinguishes email addresses from explicit owner mentions', () => withTemp((dir) => {
  const notes = write(dir, 'notes.md', 'ACTION: Email sam@example.com the agenda\nACTION: Ask @sam to draft the agenda');
  const out = path.join(dir, 'out');
  const result = runCli(['--notes', notes, '--out', out]);
  assert.equal(result.status, 0);
  const plan = JSON.parse(fs.readFileSync(path.join(out, 'action-plan.json'), 'utf8'));
  assert.deepEqual(plan.actions.map(({owner}) => owner), [null, 'sam']);
  assert.equal(plan.actions[0].approvalRequired, true);
  assert.deepEqual(plan.issues, [{id: 'action-1', severity: 'warning', message: 'Missing owner'}]);
}));

test('CLI artifacts keep weekday due hints and omit unsupported relative tokens', () => withTemp((dir) => {
  const notes = write(dir, 'notes.md', 'ACTION: @sam prepare agenda due next Friday\nACTION: @sam prepare slides due next banana');
  const out = path.join(dir, 'out');
  const result = runCli(['--notes', notes, '--out', out]);
  assert.equal(result.status, 0);
  const plan = JSON.parse(fs.readFileSync(path.join(out, 'action-plan.json'), 'utf8'));
  assert.deepEqual(plan.actions.map(({due}) => due), ['next Friday', null]);
}));

test('rejects malformed attendee documents without partial output or a stack trace', () => withTemp((dir) => {
  for (const [content, message] of [['{', 'expected valid JSON'], [JSON.stringify([]), 'expected an object'], [JSON.stringify({attendees: 'sam'}), 'expected an object'], [JSON.stringify({attendees: [{name: '  '}]}), 'non-empty name']]) {
    const attendees = write(dir, 'attendees.json', content);const notes = write(dir, 'notes.md', 'ACTION: prepare agenda');const out = path.join(dir, 'out');const result = runCli(['--notes', notes, '--attendees', attendees, '--out', out]);
    assert.equal(result.status, 1);assert.match(result.stderr, new RegExp(message));assert.doesNotMatch(result.stderr, /\n\s+at /);assert.equal(fs.existsSync(out), false);
  }
}));

test('does not overwrite a directly colliding notes input', () => withTemp((dir) => {const notes = write(dir, 'action-plan.json', 'ACTION: preserve me');const result = runCli(['--notes', notes, '--out', dir]);assert.equal(result.status, 1);assert.match(result.stderr, /collides/);assert.equal(fs.readFileSync(notes, 'utf8'), 'ACTION: preserve me');assert.equal(fs.existsSync(path.join(dir, 'review-brief.md')), false);}));

test('does not overwrite an input through a path alias', () => withTemp((dir) => {const real = path.join(dir, 'real');fs.mkdirSync(real);const alias = path.join(dir, 'alias');fs.symlinkSync(real, alias, 'dir');const attendees = write(real, 'review-brief.md', JSON.stringify({attendees: []}));const result = runCli(['--notes', write(dir, 'notes.md', 'ACTION: test alias'), '--attendees', attendees, '--out', alias]);assert.equal(result.status, 1);assert.match(result.stderr, /collides/);assert.equal(fs.readFileSync(attendees, 'utf8'), JSON.stringify({attendees: []}));assert.equal(fs.existsSync(path.join(real, 'action-plan.json')), false);}));
