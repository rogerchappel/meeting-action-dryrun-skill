# API

The package exposes pure local functions from its supported package root for
agents that prefer a library call over the CLI:

```js
import {
  buildPlan,
  extractActions,
  parseAttendees,
  renderBrief,
  validatePlan,
  writePlan
} from 'meeting-action-dryrun-skill';
```

- Input readers accept local paths supplied by the caller.
- Builders return plain JSON-compatible objects.
- Renderers produce Markdown review briefs.
- Writers create only the requested output directory.

## Attendee input

`parseAttendees(file)` reads a JSON object whose `attendees` property is an
array. Each item must be an object with a non-empty string `name`; other
properties are preserved and names are trimmed. Invalid JSON, unreadable files,
missing/non-array `attendees`, and invalid entries throw concise errors.

## Deterministic generation provenance

`buildPlan({ notes, attendees, strict, generatedAt })` does not read the wall
clock. When `generatedAt` is omitted, the returned plan contains
`generatedAt: null`, making repeated calls with identical inputs byte-stable
when written with `writePlan`. Callers that need provenance may provide an
explicit ISO-8601 timestamp containing a calendar date, time with seconds, and
either `Z` or a numeric UTC offset. Its value is preserved in the plan.
Year-only, date-only, timezone-free, RFC-date, and calendar-invalid values are
rejected. The CLI provides the same contract through `--generated-at
<timestamp>`.

## Due hints

`extractActions` recognizes `YYYY-MM-DD` and `next` followed by a full weekday
name from Monday through Sunday after the standalone word `due`, separated by
a space or colon. Weekdays are matched case-insensitively and returned with
their matched spelling preserved. Embedded text such as `overdue` and `undue`
does not create a due hint. Impossible calendar dates and unsupported relative
tokens are treated as absent and returned as `due: null`.
The current validator does not create an issue for a missing due hint, so
callers that require dates should review the nullable field explicitly.

## Owner inference

Actions can name an owner with an explicit `@mention` or by referencing an
attendee name. An `@` embedded in an email address is not treated as a mention.
Attendee-name matching is case-insensitive and accepts
punctuation boundaries, but does not match a name embedded within another word.
For example, attendee `Ann` matches `Ann, review this` but not `planning`.
Actions without an owner require approval and produce a `Missing owner` issue;
strict mode rejects the plan.

## CLI output safety

Before reading inputs or writing outputs, the CLI canonicalizes the notes path,
optional attendees path, and both generated paths. It rejects a collision with
`action-plan.json` or `review-brief.md`, including collisions hidden by symlinks
or path aliases. Input or validation errors print one `Error: ...` diagnostic,
exit nonzero, and do not write partial outputs.
