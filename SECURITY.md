# Security Policy

## Supported Versions

The current `0.1.x` release line receives security fixes while the package is
being prepared for public release.

## Reporting a Vulnerability

Please report suspected vulnerabilities through the GitHub issue tracker at
https://github.com/rogerchappel/meeting-action-dryrun-skill/issues.

Do not include secrets, private meeting transcripts, or customer data in a public
issue. Share only a minimal reproduction or a redacted fixture that demonstrates
the problem.

## Scope

This package is local-first and should not send messages, call external APIs, or
mutate remote systems. Security issues of interest include accidental disclosure
in generated review artifacts, unsafe file handling, or behavior that bypasses
the documented dry-run approval boundary.
