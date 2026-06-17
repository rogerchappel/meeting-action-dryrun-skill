# Safety Model

This project is intentionally local-first. It does not fetch remote content, send messages, mutate external tools, or treat generated artifacts as approval to act.

Agents should present generated files for review and route any later side effects through a separate approved executor.
