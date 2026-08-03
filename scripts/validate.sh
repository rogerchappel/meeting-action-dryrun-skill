#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run build
node src/cli.js --help >/dev/null
smoke_dir="$(mktemp -d)"
trap 'rm -rf "$smoke_dir"' EXIT
node src/cli.js --notes fixtures/meeting.md --attendees fixtures/attendees.json --out "$smoke_dir/out" >/dev/null
test -s "$smoke_dir/out/action-plan.json"
test -s "$smoke_dir/out/review-brief.md"
echo "smoke ok"
