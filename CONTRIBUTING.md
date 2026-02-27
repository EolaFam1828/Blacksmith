# Contributing to Blacksmith

Thank you for your interest in contributing to Blacksmith! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/EolaFam1828/Blacksmith-Claude.git
cd Blacksmith-Claude

# Install dependencies (requires Node.js >= 25)
npm install

# Run tests
npm test

# Link for local development
npm link
```

## Project Structure

```
src/
  agents/          # Agent lifecycle, runner, sub-agent pipelines
  backends/        # LLM provider integrations (ollama, claude, gemini, etc.)
  brain/           # Local NotebookLM system (query, route, archive)
  identity/        # Intent.md parsing, department routing
  ledger/          # SQLite cost tracking and reporting
  mcr/             # Model Capability Registry
  orchestrator/    # Task classification, agent assembly, workflows
  tui/             # Interactive terminal UI (Ink/React)
  utils/           # Config, paths, git, session, formatting
  workflows/       # Extended workflow implementations
  cli.js           # Commander-based CLI builder
  defaults.js      # Default configs, MCR, Intent, brain registry

bin/
  blacksmith.js    # Entry point (routes to TUI or CLI)

test/              # Node.js native test runner
```

## Code Style Conventions

- **ESM only** — all files use `import`/`export`, no CommonJS
- **`node:` prefix** — always use `node:fs/promises`, `node:path`, etc.
- **Named exports** — prefer named exports over default exports
- **htm for TUI** — TUI components use `htm` tagged template literals instead of JSX (no build step)
- **No TypeScript** — plain JavaScript with clear function signatures
- **Chalk v5** — ESM-compatible terminal styling via `src/utils/style.js`

## How to Add a New Command

1. **Define the command** in `src/cli.js` using `attachWorkflowCommand()` or a manual Commander `.command()` chain.

2. **Add routing logic** (if needed) in `src/orchestrator/classifier.js` — add keywords for complexity detection and department assignment.

3. **Register in TUI** by adding an entry to the `commands` array in `src/tui/commands.js`.

4. **Write tests** in `test/` using Node's native `test` module:

```js
import test from "node:test";
import assert from "node:assert/strict";

test("my-command dry-run produces expected output", async () => {
  const output = await runCli(["my-command", "args", "--dry-run"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  assert.match(output, /expected pattern/);
});
```

## Pull Request Guidelines

- **One feature per PR** — keep changes focused and reviewable
- **All tests must pass** — run `npm test` before submitting
- **No build step** — do not introduce Babel, TypeScript, or bundlers
- **Update CHANGELOG.md** — add your changes under an `[Unreleased]` section
- **Descriptive commits** — use clear, concise commit messages

## Testing

Tests use Node's built-in test runner (`node --test`). Each test creates an isolated `BLACKSMITH_HOME` temp directory so tests don't interfere with each other or with your local config.

```bash
# Run all tests
npm test

# Run a single test file
node --test test/cli.test.js
```

## Questions?

Open an issue on GitHub or start a discussion. We're happy to help!
