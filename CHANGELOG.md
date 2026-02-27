# Changelog

All notable changes to Blacksmith are documented in this file.

## [0.2.0] - 2026-02-26

### Added
- Interactive TUI: launch with `blacksmith` (no arguments) for a full-screen terminal interface
  - Command palette with fuzzy search (`/`)
  - Real-time status bar with model, cost, brain, and session info
  - Scrollable output history
  - Help overlay (`?`)
- One-line install script (`install.sh`) with dependency checking
- Comprehensive documentation: README, CONTRIBUTING, LICENSE, CHANGELOG
- New dependencies: `ink`, `react`, `htm`, `fuse.js`, `@inkjs/ui`

### Changed
- Version bump to 0.2.0
- Entry point now routes to TUI when no subcommand is given

## [0.1.0] - 2026-02-01

### Added
- Core orchestration engine with two-tier task classification
- 12 workflow commands: ask, build, research, compare, summarize, debug, refactor, review, commit, deploy, diagnose, provision
- Brain system: local NotebookLM with 8 default notebooks, query routing, archival
- Identity layer: Intent.md parsing, department routing, profile management
- Model Capability Registry (MCR): 7 models across 5 backends
- Cost tracking: SQLite ledger, spend reports, HTML dashboard
- Dynamic agent assembly: per-task spec generation from identity + brain + context
- Sub-agent pipelines with checkpoints for multi-step workflows
- Auto-escalation chain: ollama -> gemini-flash -> gemini-pro -> claude
- Context loading: git diffs, file content, git blame, recent changes
- Worktree isolation for destructive operations
- Self-improvement: routing performance analysis after 50+ tasks
- Backend integrations: Ollama (HTTP), Claude CLI, Gemini CLI, Codex CLI, GitHub CLI
