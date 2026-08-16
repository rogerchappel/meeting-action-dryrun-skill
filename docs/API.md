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
explicit ISO-8601 timestamp; its value is preserved in the plan, and invalid
timestamps are rejected. The CLI provides the same contract through
`--generated-at <timestamp>`.

## Owner inference

Actions can name an owner with an explicit `@mention` or by referencing an
attendee name. Attendee-name matching is case-insensitive and accepts
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
