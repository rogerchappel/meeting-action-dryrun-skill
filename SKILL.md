# meeting-action-dryrun-skill

Use this skill when an agent needs turn meeting notes into proposed follow-up actions and dry-run payloads without sending messages.

## Inputs

Local fixture or workflow files described in the README.

Write an explicit attendee owner before the task colon when an action mentions
other attendees, for example `ACTION: Sam: ask Lee to prepare the recap`.
Multiple attendee names without that leading-owner form remain review-gated.

## Side effects

Writes local output files only. It does not execute connector actions or contact external services.

## Approval requirements

Any generated action, claim, or approval record must be reviewed before an external executor uses it.

## Validation

Run `npm run smoke`, inspect generated JSON and Markdown, and resolve any review issues.
