# PR Evidence

## Local verification

- Date: 2026-11-09 (UTC)
- Runtime: Node.js v26.5.0, npm 11.17.0
- Command: `npm run release:check`
- Result: pass (check, build, 49 tests, smoke, and package smoke)

Node.js 26 is outside this package's supported range (`>=20 <26`) and is not part of the CI matrix. This run is recorded as a local smoke check only; it does not establish supported-runtime verification. CI is the source of supported-runtime evidence (Node.js 20, 22, 24, and 25).
