#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run build
node src/cli.js --help >/dev/null
echo "smoke ok"
