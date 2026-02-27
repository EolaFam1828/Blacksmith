# Blacksmith

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >= 25](https://img.shields.io/badge/node-%3E%3D25-brightgreen.svg)](https://nodejs.org)
[![Tests Passing](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing)

**Agents that build agents.** Blacksmith is an AI-powered CLI that dynamically assembles purpose-built agents for every task. Instead of shipping a one-size-fits-all system prompt, Blacksmith generates minimal, task-specific agent specs from your project identity, local brain, and real-time context — then routes to the cheapest model that can handle the job.

## Quickstart

### One-Line Install

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/EolaFam1828/Blacksmith/main/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/EolaFam1828/Blacksmith/main/install.ps1 | iex
```

### Manual Install

```bash
git clone https://github.com/EolaFam1828/Blacksmith.git
cd Blacksmith
npm install
npm link
blacksmith brain init
```

### First Run

```bash
# Launch the interactive TUI (setup wizard runs automatically on first launch)
blacksmith

# Or run a one-shot command
blacksmith ask "What port does Redis use?"

# See all commands
blacksmith --help
```

On first launch, Blacksmith runs a **setup wizard** that probes your system for available backends (Ollama, Claude CLI, Gemini CLI, Codex CLI, GitHub CLI), auto-configures which ones are enabled, and saves the results. You can re-run it at any time:

```bash
# Re-run the setup wizard
blacksmith setup
```

## Architecture

Blacksmith uses a two-tier orchestration model:

```
                    ┌─────────────────────┐
                    │   blacksmith <cmd>   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Task Classifier    │
                    │  complexity / dept   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                 │
     ┌────────▼────────┐             ┌──────────▼──────────┐
     │    Tier 1        │             │      Tier 2          │
     │  Deterministic   │             │  Brain-Assisted      │
     │  (passthrough)   │             │  (full orchestration)│
     └────────┬────────┘             └──────────┬──────────┘
              │                                 │
              │                      ┌──────────▼──────────┐
              │                      │  Query Brain         │
              │                      │  Load Identity       │
              │                      │  Assemble Agent Spec │
              │                      │  Load Context        │
              │                      │  Estimate Cost       │
              │                      └──────────┬──────────┘
              │                                 │
              └────────────────┬────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Backend Router     │
                    │  ollama / claude /   │
                    │  gemini / codex      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Auto-Escalation    │
                    │  ollama → flash →    │
                    │  pro → claude        │
                    └─────────────────────┘
```

**Tier 1** (deterministic): Simple tasks like `ask` and `commit` skip the brain and go straight to the cheapest model. Fast, zero overhead.

**Tier 2** (brain-assisted): Complex tasks get the full pipeline — brain query, identity parsing, dynamic agent assembly, context loading, cost estimation, and optional sub-agent pipelines with checkpoints.

## Commands

### Task Workflows

| Command | Description | Default Model |
|---------|-------------|---------------|
| `ask <task>` | Raw passthrough query | ollama-qwen2.5-coder |
| `ask <task> --deep` | Upgraded to Tier 2 orchestration | varies by task |
| `build <task>` | Implementation workflow | claude-code |
| `research <task>` | Research and synthesis | gemini-2.0-pro |
| `compare <a> <b> --for <use>` | Side-by-side comparison | gemini-2.0-pro |
| `summarize <target>` | Summarize URL or file | gemini-2.0-flash |
| `debug <task>` | Debugging workflow | varies by complexity |
| `refactor <target> --goal <g>` | Multi-step refactor with checkpoints | claude-code |
| `review [target]` | Code review | claude-code |
| `commit` | Commit message from staged diff | ollama-qwen2.5-coder |
| `deploy --env <env>` | Deployment planning | claude-code |
| `diagnose [task]` | Infrastructure diagnosis | claude-code |
| `provision <task>` | Provisioning workflow | claude-code |

### Brain (Local Knowledge)

| Command | Description |
|---------|-------------|
| `brain init` | Initialize notebook registry |
| `brain list` | List all notebooks |
| `brain ask <name> <query>` | Query a specific notebook |
| `brain add <name> <source>` | Add source file to notebook |
| `brain project add <name>` | Create project-specific notebook |
| `brain health` | Check notebook health |
| `brain refresh` | Refresh notebook sources |
| `brain archive <name>` | Archive a notebook |
| `brain <query>` | Auto-routed query across all notebooks |

### System

| Command | Description |
|---------|-------------|
| `identity` | Show parsed identity (mission, departments) |
| `mcr show` | Show model capability registry |
| `mcr compare <a> <b> --for <use>` | Compare two models |
| `config show` | Show current configuration |
| `config set <key> <value>` | Update a config value |
| `spend` | Total spend summary |
| `spend --dashboard` | Generate HTML spend dashboard |
| `map` | Update project tree in Intent.md |
| `routing-report` | Generate routing analysis |
| `setup` | Re-run the first-run setup wizard |

## Global Options

```
--backend <backend>   Override backend (ollama, claude, gemini, openai, codex, jules)
--model <model>       Override model selection
--dry-run             Show execution plan without running
--force               Skip cost guardrail confirmations
--file <path...>      Additional file context (multi-value)
```

## Interactive TUI

Run `blacksmith` with no arguments to launch the interactive terminal UI:

- **`/`** — Open command palette with fuzzy search (includes `setup` to re-run the wizard)
- **`?`** — Toggle keyboard shortcut help
- **`q`** — Quit
- **Type any task** — Automatically routed (prefix with a command name, or defaults to `ask`)

The TUI shows a live status bar with the active model, running cost, brain notebook count, and session history.

On first launch, the TUI automatically opens the **setup wizard** to detect available backends. After completing setup, subsequent launches go straight to the main interface.

## Configuration

All configuration lives in `~/.blacksmith/`:

| File | Purpose |
|------|---------|
| `config.yaml` | Backend settings, routing rules, cost guards, `setup_completed` flag |
| `Intent.md` | Organizational identity (mission, departments, owner) |
| `OrchestratorPrompt.md` | Orchestrator behavior guide |
| `mcr.yaml` | Model Capability Registry |
| `brain.yaml` | Notebook registry |
| `notebooks/` | Markdown notebook files |
| `sessions/` | Session tracking (JSON) |
| `logs/` | Execution logs |
| `reports/` | Generated reports and dashboards |

### Cost Guards

```yaml
# In config.yaml
routing:
  cost_warning_threshold: 0.50   # Warn above this
  cost_hard_stop: 2.00           # Require --force above this
  auto_escalate: true            # Escalate on weak responses
```

## Project Structure

```
Blacksmith-Claude/
├── bin/
│   └── blacksmith.js          # Entry point (TUI or CLI)
├── src/
│   ├── agents/                # Agent lifecycle & execution
│   ├── backends/              # LLM provider integrations
│   ├── brain/                 # Local NotebookLM system
│   ├── identity/              # Intent.md parsing
│   ├── ledger/                # SQLite cost tracking
│   ├── mcr/                   # Model Capability Registry
│   ├── orchestrator/          # Task routing & agent assembly
│   ├── tui/                   # Interactive terminal UI
│   ├── utils/                 # Config, paths, git, formatting
│   ├── workflows/             # Extended workflow implementations
│   ├── cli.js                 # CLI command definitions
│   ├── defaults.js            # Default configurations
│   └── map.js                 # Project tree generation
├── test/                      # Node.js native test runner
├── install.sh                 # One-line installer
├── package.json
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

## Supported Backends

| Backend | Provider | Models | Cost | Notes |
|---------|----------|--------|------|-------|
| ollama | Local | qwen2.5-coder, deepseek-r1, llama-3.3-70b, nomic-embed, mxbai-embed | Free | Default for simple tasks |
| claude | Anthropic | claude-code (3.7 Sonnet), claude-3.5-haiku | $0.25–$15 per 1M | Default for complex tasks |
| gemini | Google | gemini-2.0-pro, gemini-2.0-flash | $0.10–$10 per 1M | Default for research |
| openai | OpenAI | gpt-4.5, o3, o3-mini, gpt-4o-mini | $0.15–$60 per 1M | Deep reasoning & economy |
| codex | OpenAI | codex-cli | $2.5/$10 per 1M | Alternative for code tasks |
| jules | Google | jules-cli | Async | Asynchronous operations |
| github | GitHub | gh CLI | N/A | Native git/PR operations |

## Testing

```bash
# Run all tests
npm test

# Run a single test file
node --test test/cli.test.js
```

Tests use Node's native `node --test` runner. Each test creates an isolated temporary `BLACKSMITH_HOME` to avoid side effects.

## License

[MIT](LICENSE) - Copyright (c) 2026 EolaFam1828
