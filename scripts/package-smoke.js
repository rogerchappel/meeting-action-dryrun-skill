import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-action-package-smoke-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
  return result;
}

const required = [
  'src/cli.js',
  'src/index.js',
  'fixtures/meeting.md',
  'fixtures/attendees.json',
  'docs/RELEASE_CANDIDATE.md',
  'SKILL.md',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md'
];

try {
  const pack = run('npm', ['pack', '--json', '--pack-destination', temporaryDirectory]);
  const [metadata] = JSON.parse(pack.stdout);
  const files = new Set(metadata.files.map(({ path: file }) => file));
  const missing = required.filter((entry) => !files.has(entry));
  if (missing.length > 0) throw new Error(`package smoke missing entries:\n${missing.join('\n')}`);

  const tarball = path.join(temporaryDirectory, metadata.filename);
  const consumer = path.join(temporaryDirectory, 'consumer');
  fs.mkdirSync(consumer);
  fs.writeFileSync(path.join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd: consumer });

  const executable = path.join(consumer, 'node_modules', '.bin', 'meeting-action-dryrun');
  const installedPackage = path.join(consumer, 'node_modules', 'meeting-action-dryrun-skill');
  const outputDirectory = path.join(consumer, 'output');
  run(executable, [
    '--notes', path.join(installedPackage, 'fixtures', 'meeting.md'),
    '--attendees', path.join(installedPackage, 'fixtures', 'attendees.json'),
    '--out', outputDirectory
  ], { cwd: consumer });
  for (const file of ['action-plan.json', 'review-brief.md']) {
    if (!fs.existsSync(path.join(outputDirectory, file))) throw new Error(`installed CLI did not create ${file}`);
  }

  const boundaryNotes = path.join(consumer, 'due-boundary.md');
  const boundaryOutput = path.join(consumer, 'due-boundary-output');
  fs.writeFileSync(boundaryNotes, 'ACTION: @sam review overdue: 2026-09-01\nACTION: @sam prepare agenda due: 2026-09-02\n');
  run(executable, ['--notes', boundaryNotes, '--out', boundaryOutput], { cwd: consumer });
  const boundaryPlan = JSON.parse(fs.readFileSync(path.join(boundaryOutput, 'action-plan.json'), 'utf8'));
  if (boundaryPlan.actions[0].due !== null || boundaryPlan.actions[1].due !== '2026-09-02') {
    throw new Error('installed CLI did not preserve due-hint word boundaries');
  }

  const expectedExports = ['buildPlan', 'extractActions', 'parseAttendees', 'renderBrief', 'validatePlan', 'writePlan'];
  const importCheck = `
    const packageApi = await import('meeting-action-dryrun-skill');
    const expected = ${JSON.stringify(expectedExports)};
    const missing = expected.filter((name) => typeof packageApi[name] !== 'function');
    if (missing.length) throw new Error('missing function exports: ' + missing.join(', '));
  `;
  run(process.execPath, ['--input-type=module', '--eval', importCheck], { cwd: consumer });

  console.log(`package smoke passed: ${metadata.filename}`);
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
