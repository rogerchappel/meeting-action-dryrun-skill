# API

The package exposes pure local functions from `src/index.js` for agents that prefer a library call over the CLI.

- Input readers accept local paths supplied by the caller.
- Builders return plain JSON-compatible objects.
- Renderers produce Markdown review briefs.
- Writers create only the requested output directory.
