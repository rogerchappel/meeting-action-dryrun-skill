# meeting-action-dryrun-skill

Turn meeting notes into proposed follow-up actions and dry-run payloads without sending messages.

Use it when an agent needs to convert a meeting transcript, notes file, or
agenda recap into reviewable next steps without touching email, chat, calendars,
or task trackers.

## Quickstart

```bash
npm install
npm test
npm run smoke
node src/cli.js --notes fixtures/meeting.md --attendees fixtures/attendees.json --out meeting-action-out
```

The command writes `action-plan.json` and `review-brief.md` into the output
directory so another local tool can inspect the dry-run payloads.

After installing the package, library consumers can use the supported root
import:

```js
import { buildPlan, extractActions } from 'meeting-action-dryrun-skill';
```

See [docs/API.md](docs/API.md) for the complete exported API.

`--notes <file>` is required. `--attendees <file>` and `--strict` are optional.
The `--out <dir>` option is also optional and defaults to
`meeting-action-out`. Invalid or incomplete options print usage guidance to
stderr and exit with status 2.

Generated artifacts are byte-stable for identical notes, attendees, and
options. `generatedAt` is `null` by default so generation never depends on the
wall clock. To retain provenance, pass an ISO-8601 timestamp containing a
calendar date, time with seconds, and either `Z` or a numeric UTC offset with
`--generated-at`, for example `--generated-at 2026-08-11T02:08:00.000Z`.
Year-only, date-only, timezone-free, RFC-date, and calendar-invalid values are
rejected.
Repeating the command with that same value produces identical artifacts.

Due hints use `YYYY-MM-DD` or `next` followed by Monday, Tuesday, Wednesday,
Thursday, Friday, Saturday, or Sunday. Weekday matching is case-insensitive and
the matched spelling is preserved in `due`. Calendar-invalid dates such as
`2026-02-29` and unsupported phrases such as `next banana` are treated as
missing (`due: null`) so downstream review does not receive an invalid
commitment. Missing due hints do not currently add a validation issue;
reviewers should inspect the nullable `due` field.

Attendee JSON uses the shape `{"attendees":[{"name":"Sam"}]}`. The
`attendees` value must be an array of objects, each with a non-empty string
`name`. Malformed, unreadable, or incorrectly shaped files produce a concise
error without partial outputs.

Owners are inferred from explicit mentions such as `@sam`, `@sam-dev`,
`@sam_ops`, or `@sam.dev`, or from attendee names found at word boundaries.
Mention punctuation is supported between letters or digits; sentence
punctuation is excluded, so `@sam.` assigns the action to `sam`. An `@` inside
an email address, such as `sam@example.com`, is not an owner mention; without
another owner signal the action retains its `Missing owner` warning and
requires approval.

Channel keywords (`email`, `crm`, and `calendar`) and risk keywords such as
`send`, `publish`, `customer`, and `deadline` match complete words or phrases.
Longer words such as `sender`, `publisher`, `emailed`, and `calendarization`
do not change the default channel or raise an action's risk.

The canonical `--notes` and `--attendees` paths must not match either generated
file under `--out`. Equivalent paths reached through symlinks or other aliases
are rejected before any input is modified.

```bash
node src/cli.js --help
```

## What It Produces

- a proposed action plan with owners, due-date hints, and confidence signals
- a review brief that separates facts from inferred follow-up work
- dry-run payloads for downstream tools that require explicit approval before use
- warnings for vague owners, missing dates, or unclear action wording

## Verification

Run the local release-readiness checks before publishing or handing the skill to
another agent:

```bash
npm run check
npm run build
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

## Safety and Limitations

Local files only. No network calls, publishing, or external account writes. Generated outputs are review artifacts and require human approval before downstream action.

The parser and artifact generation are deterministic and conservative. They do not understand private
calendar state, organization-specific ownership rules, or commitments that are
not present in the supplied notes.

## Support

Report public release-readiness issues at https://github.com/rogerchappel/meeting-action-dryrun-skill/issues.
