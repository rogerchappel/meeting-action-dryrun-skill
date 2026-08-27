# Changelog

## Unreleased

- Restrict `next <weekday>` due hints to full weekday names and ignore
  unsupported relative tokens.
- Require due hints to start with the standalone word `due`, preventing words
  such as `overdue` and `undue` from creating deadlines.

## 0.1.0

- Initial pre-release package for turning meeting notes into proposed follow-up actions and dry-run payloads.
- Includes the CLI, reusable skill instructions, fixtures, validation scripts, and package smoke coverage.
