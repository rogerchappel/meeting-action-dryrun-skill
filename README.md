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
node src/cli.js fixtures/meeting.md --attendees fixtures/attendees.json --format markdown
```

For JSON output that another local tool can inspect:

```bash
node src/cli.js fixtures/meeting.md --attendees fixtures/attendees.json --format json
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

The parser is deterministic and conservative. It does not understand private
calendar state, organization-specific ownership rules, or commitments that are
not present in the supplied notes.

## Support

Report public release-readiness issues at https://github.com/rogerchappel/meeting-action-dryrun-skill/issues.
