#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildPlan, parseAttendees, writePlan } from './index.js';

const usage = `Usage: meeting-action-dryrun --notes <file> [options]

Options:
  --notes <file>      Meeting notes to process (required)
  --attendees <file>  Attendee data as JSON
  --out <dir>         Output directory (default: meeting-action-out)
  --generated-at <timestamp>
                      Explicit ISO-8601 provenance timestamp
  --strict            Treat validation warnings as errors
  --help              Show this help

Usage errors exit with status 2.`;

function usageError(message) {
  console.error(`Error: ${message}\n\n${usage}`);
  process.exit(2);
}

function parseArgs(args) {
  const options = {
    attendeesFile: undefined,
    generatedAt: undefined,
    notesFile: undefined,
    outDir: 'meeting-action-out',
    strict: false
  };
  const valueOptions = new Map([
    ['--notes', 'notesFile'],
    ['--attendees', 'attendeesFile'],
    ['--generated-at', 'generatedAt'],
    ['--out', 'outDir']
  ]);
  const seen = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === '--strict') {
      if (seen.has(option)) usageError(`Duplicate option: ${option}`);
      seen.add(option);
      options.strict = true;
      continue;
    }

    const key = valueOptions.get(option);
    if (!key) {
      usageError(option.startsWith('-') ? `Unknown option: ${option}` : `Unexpected argument: ${option}`);
    }
    if (seen.has(option)) usageError(`Duplicate option: ${option}`);

    const value = args[index + 1];
    if (!value || value.startsWith('-')) usageError(`Missing value for ${option}`);

    seen.add(option);
    options[key] = value;
    index += 1;
  }

  if (!options.notesFile) usageError('Missing required option: --notes');
  return options;
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(usage);
  process.exit(0);
}

function canonical(file) {
  let current = path.resolve(file);
  const suffix = [];
  while (!fs.existsSync(current)) {
    suffix.unshift(path.basename(current));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.join(fs.realpathSync(current), ...suffix);
}

function assertDistinctInputs(notesFile, attendeesFile, outDir) {
  const inputs = [notesFile, attendeesFile].filter(Boolean).map(canonical);
  const outputs = ['action-plan.json', 'review-brief.md'].map((file) => canonical(path.join(outDir, file)));
  if (inputs.some((input) => outputs.includes(input))) throw new Error('Output path collides with an input file');
}

const { attendeesFile, generatedAt, notesFile, outDir, strict } = parseArgs(args);
try {
  assertDistinctInputs(notesFile, attendeesFile, outDir);
  const plan = buildPlan({notes: fs.readFileSync(notesFile, 'utf8'), attendees: parseAttendees(attendeesFile), strict, generatedAt});
  writePlan(plan, outDir);
  console.log(`Wrote ${outDir}/action-plan.json and ${outDir}/review-brief.md`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
