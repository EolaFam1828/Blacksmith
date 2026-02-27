# Blacksmith — Master Architecture Document

> Agents that build agents. Not because it's clever — because it's cheaper.

**Version**: 2.1.1 — Consolidated
**Date**: February 26, 2026
**Author**: Jake + Claude

---

## Table of Contents

1. Philosophy & Core Insight
2. System Architecture
3. The Identity Layer (Intent.md + OrchestratorPrompt.md)
4. The Brain (NotebookLM Multi-Notebook Topology)
5. Model Capability Registry (MCR)
6. Orchestrator Design
7. Dynamic Agent Assembly
8. Sub-Agent Architecture
9. Ephemeral Agent Lifecycle
10. Task Teardown & Prerequisites System
11. The Compounding Loop
12. Token Economics
13. Ecosystem Borrowing
14. CLI Commands
15. Directory Structure & Config
16. Build Order
17. Domain Agnosticism
18. What This Is NOT

---

## 1. Philosophy & Core Insight

Every AI framework today does this:

```
Human → Static System Prompt + Static Tools + Static Memory → Model → Output
```

The problem: that static context is 95% irrelevant to any given task. You're
paying to send a 10,000-token system prompt when the task needs 200 tokens of
instruction. OpenClaw's SOUL.md, AGENTS.md, memory files, skills — all loaded
every single time, whether relevant or not. That's where the token burn lives.

Blacksmith does this:

```
Human → Orchestrator (lightweight classification + dynamic agent assembly)
       → Purpose-Built Ephemeral Agent (generated per-task)
       → Execute → Compress → Store → Teardown
```

The orchestrator spends ~500 tokens classifying your task and generating a
precision-targeted agent spec. That agent executes with ONLY the context
it needs. Net result: fewer total tokens, higher quality output.

**It LOOKS like it should eat tokens fast. It doesn't. Because precision > volume.**

Three rules:

1. Never spend a cloud token on something Ollama can handle locally
2. Never add abstraction that doesn't directly reduce cost or increase quality
3. Every token spent gets logged. No silent burns.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         HUMAN INPUT                                  │
│                  (natural language task)                              │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR LAYER                                 │
│           (Reads: OrchestratorPrompt.md + Intent.md)                 │
│                                                                      │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐           │
│  │    Task      │  │  Query Brain     │  │   Agent      │           │
│  │Classification│→ │  (NotebookLM)    │→ │  Assembly    │           │
│  │              │  │                  │  │  (Dynamic)   │           │
│  │ Tier 1:     │  │ Routes to:       │  │              │           │
│  │  Pattern    │  │ - models notebook│  │ Generates:   │           │
│  │  match      │  │ - project nb     │  │ - soul.md    │           │
│  │             │  │ - history nb     │  │ - agents.md  │           │
│  │ Tier 2:     │  │ - errors nb      │  │ - memory.md  │           │
│  │  Brain      │  │ - reference nb   │  │   (prereqs)  │           │
│  │  query      │  │                  │  │ - skills.md  │           │
│  └─────────────┘  └──────────────────┘  │ - runtime.md │           │
│                                          └──────────────┘           │
│                    ┌──────────────────┐                              │
│                    │ Cost Efficiency  │                              │
│                    │ Guard            │                              │
│                    └──────────────────┘                              │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EPHEMERAL AGENT EXECUTION                         │
│              (Purpose-built, single-use)                             │
│                                                                      │
│  soul.md ← Identity from Intent.md department                        │
│  memory.md ← prerequisites.md from NotebookLM query                  │
│  skills.md ← Only tools needed for THIS task                         │
│  runtime.md ← Model, limits, timeout from Brain recommendation       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  AGENTIC LOOP (with optional sub-agent dispatch)             │   │
│  │  intake → context → inference → tool exec → output           │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    TASK TEARDOWN                                      │
│                                                                      │
│  ┌──────────┐  ┌───────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Compress │→ │ Route Summary │→ │  Log to  │→ │   Teardown    │  │
│  │ Output   │  │ to correct   │  │  Ledger  │  │   Agent Spec  │  │
│  │ (/compact│  │ NotebookLM   │  │ (SQLite) │  │   (ephemeral) │  │
│  │  style)  │  │ notebook(s)  │  │          │  │               │  │
│  └──────────┘  └───────────────┘  └──────────┘  └───────────────┘  │
│                        │                                             │
│                        ▼                                             │
│               Brain now has MORE context                             │
│               for the NEXT task's prerequisites                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Available Backends

```
┌──────┬──────┬──────┬──────┬──────┬──────────────────┐
│      │      │      │      │      │                  │
│Claude│Gemini│Codex │Jules │Ollama│   GitHub CLI     │
│ Code │ CLI  │ CLI  │ CLI  │(local)│  (native)       │
│      │      │      │      │      │                  │
└──────┴──────┴──────┴──────┴──────┴──────────────────┘
```

---

## 3. The Identity Layer

Two files define WHO Blacksmith is and HOW it behaves. Together they are the
organizational DNA that every agent inherits from.

### Intent.md — The Organizational DNA

You write this. It rarely changes. It defines mission, values, and the
sub-agent architecture via "Departments."

Location: `~/.blacksmith/Intent.md`

```markdown
# Intent.md — Blacksmith System Identity

## Mission
Build and maintain high-quality software systems with maximum efficiency
and minimum waste. Every token spent should produce measurable value.

## Vision
A personal AI development environment that compounds knowledge over time,
making each interaction smarter than the last. Not a product — a workshop.

## Values
- **Precision over volume**: A 200-token targeted prompt beats a 10,000-token generic one
- **Local first**: Never send to the cloud what can be handled on the machine
- **Transparency**: Every cost visible, every decision traceable
- **Composability**: Small tools, clear interfaces, replaceable parts
- **Earned complexity**: Add abstraction only when simplicity fails

## Principles
- Ship working code, not perfect architecture
- Measure everything, optimize what matters
- Human checkpoints before destructive actions
- Fail fast, fail cheap (try Ollama first, escalate if needed)
- Context is king — the right 500 tokens beat the wrong 50,000

## Owner Context
- Name: Jake
- Role: Corporate Development Officer (current), AI Engineer (target)
- Technical depth: Infrastructure, DevOps, AI/ML, full-stack
- Projects: Blacksmith, Aether, CampaignOS, Eola Gateway homelab
- Communication style: Direct, technical, no fluff
- Decision framework: Pragmatic — "does this actually work?"

## Departments (Sub-Agent Architecture)

### Engineering
- **Focus**: Code quality, architecture, debugging, refactoring
- **Default models**: Claude Code (complex), Ollama (simple)
- **Review standard**: Two-stage (spec compliance → quality)
- **Methodology**: Design → Plan → Implement → Test → Review

### Research
- **Focus**: Technology evaluation, comparison, synthesis
- **Default models**: Gemini Pro (deep), Gemini Flash (quick)
- **Output standard**: Structured findings with sources
- **Methodology**: Define scope → Multi-source gather → Synthesize → Recommend

### Infrastructure
- **Focus**: Homelab, cloud, networking, deployment, IaC
- **Default models**: Claude Code (IaC), Gemini Pro (troubleshooting)
- **Safety standard**: Human checkpoint before any destructive action
- **Methodology**: Diagnose → Plan → Execute → Verify → Document

### Operations
- **Focus**: Git workflow, commit messages, PR management, CI/CD
- **Default models**: Ollama (commits), GitHub CLI (native ops)
- **Automation level**: Full auto for commits, human approval for merges
- **Methodology**: Detect change → Generate → Validate → Apply

## File Tree (Project Map)
<!-- Auto-generated by `blacksmith map` — updated on each run -->
```

### How Intent.md Flows Through the System

```
                    ┌────────────┐
                    │ Intent.md  │ ← You write this (rarely changes)
                    │            │
                    │ Mission    │
                    │ Values     │
                    │ Principles │
                    │ Departments│
                    │ File Tree  │
                    └─────┬──────┘
                          │
              ┌───────────┼───────────────┐
              │           │               │
              ▼           ▼               ▼
    ┌─────────────┐ ┌──────────┐  ┌────────────────┐
    │Orchestrator │ │ Agent    │  │ Sub-Agent      │
    │Prompt.md    │ │ Assembly │  │ Assembly       │
    │             │ │          │  │                │
    │ Reads:      │ │ Inherits:│  │ Inherits:      │
    │ - Routing   │ │ - Values │  │ - Department   │
    │   rules     │ │ - Tone   │  │   focus        │
    │ - Tier logic│ │ - Owner  │  │ - Review       │
    │ - Cost guard│ │   context│  │   standards    │
    │ - Checkpts  │ │ - Dept   │  │ - Safety rules │
    └─────────────┘ │   config │  └────────────────┘
                    └──────────┘
```

### OrchestratorPrompt.md — Orchestrator Behavior

This is the system prompt for the orchestrator itself. Unlike Intent.md
(which you write and rarely change), this gets refined as you use the system.

Location: `~/.blacksmith/OrchestratorPrompt.md`

```markdown
# OrchestratorPrompt.md — Orchestrator Behavior

## Role
You are the Blacksmith orchestrator. Your job is to classify incoming tasks,
query the Blacksmith Brain (NotebookLM) for relevant context and model selection,
assemble a purpose-built ephemeral agent, and route execution to the right
backend. You are NOT the executor — you are the dispatcher.

## Decision Process

1. **Receive** human input (task description)
2. **Classify** task type, complexity, and department (per Intent.md)
3. **Query Brain** for:
   - Model recommendation (grounded in benchmarks + past performance)
   - Relevant prerequisites (past tasks, errors, decisions)
   - Cost estimate
4. **Assemble** ephemeral agent spec:
   - soul (identity + tone, derived from Intent.md department)
   - agents (sub-agent definitions if multi-step)
   - memory (prerequisites from Brain query)
   - skills (tool schemas needed for this specific task)
   - runtime (model, limits, timeout)
5. **Estimate** cost and flag if over threshold
6. **Execute** or request human confirmation
7. **Teardown** — compress output, push to Brain, log to ledger

## Routing Rules

### Tier 1: Deterministic (zero LLM cost)
Pattern-matched commands route without any model inference:
- `blacksmith commit` → Ollama (always)
- `blacksmith ask --backend X` → direct passthrough
- `blacksmith spend` / `blacksmith config` / `blacksmith brain` → internal commands
- Known command + simple args → deterministic routing

### Tier 2: Brain-Assisted (NotebookLM query)
For ambiguous or complex tasks:
- Query the Brain with task description + project context
- Brain returns: model recommendation, prerequisites, cost estimate
- Generate ephemeral agent spec from Brain response

### Escalation Rules
- If Ollama response quality < threshold → re-route to Gemini Flash
- If Gemini Flash insufficient → escalate to Gemini Pro or Claude
- Never escalate Jules (async-only, escalation doesn't apply)
- Always inform user when escalating

## Cost Guard
- Warn if single task estimated > $0.50
- Hard stop if estimated > $2.00 (require explicit `--force`)
- Daily spend summary auto-generated at midnight

## Human Checkpoints
ALWAYS require confirmation before:
- Deleting files or branches
- Pushing to remote repositories
- Running deployment commands
- Any operation flagged as destructive in the agent spec

## Self-Improvement
After every 50 tasks, generate a routing performance summary:
- Which model selections were optimal?
- Where did escalations happen?
- What patterns could be moved to Tier 1?
Update this prompt with learned patterns.
```

---

## 4. The Brain (NotebookLM Multi-Notebook Topology)

NotebookLM is flat — no folders, no nesting, no tagging within a notebook.
Dumping everything into one notebook degrades retrieval quality. The solution
is purpose-built notebooks with query routing at the orchestrator level.

One brain, many lobes. Each notebook is a specialized knowledge domain.

### Notebook Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    FORGE BRAIN (Notebook Registry)                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  📊 Models   │  │  🔧 Projects │  │  📋 Task History      │ │
│  │              │  │              │  │                       │ │
│  │ benchmarks   │  │ One notebook │  │  One notebook per     │ │
│  │ pricing      │  │ PER project  │  │  department           │ │
│  │ capabilities │  │              │  │  (from Intent.md)     │ │
│  │ routing rules│  │ blacksmith/  │  │                       │ │
│  │ comparisons  │  │ aether/      │  │  engineering-history/ │ │
│  │              │  │ campaignos/  │  │  research-history/    │ │
│  │              │  │ eola-gw/     │  │  infra-history/       │ │
│  │              │  │              │  │  ops-history/         │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  🐛 Errors   │  │  📖 Reference│                             │
│  │              │  │              │                             │
│  │ error patterns│  │ Intent.md   │                             │
│  │ resolutions  │  │ style guides │                             │
│  │ stack traces │  │ conventions  │                             │
│  │ workarounds  │  │ API docs     │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Notebook Definitions

```yaml
# ~/.blacksmith/brain.yaml — Notebook Registry

notebooks:

  models:
    id: null                    # populated after `blacksmith brain init`
    purpose: "Model selection intelligence"
    description: >
      Benchmarks, pricing, capability profiles, and routing principles
      for all available AI models. Queried during Tier 2 orchestration.
    sources:
      permanent:
        - "model-benchmarks.md"
        - "model-pricing.md"
        - "model-capabilities.md"
        - "routing-principles.md"
        - "model-comparison-notes.md"
      refresh:
        benchmarks: weekly
        pricing: monthly
    max_sources: 30

  # One per project — created via `blacksmith brain project add <name>`
  project-blacksmith:
    id: null
    purpose: "Blacksmith project knowledge"
    description: >
      Architecture decisions, file structure, dependency choices,
      patterns, and conventions specific to the Blacksmith project.
    sources:
      permanent:
        - "blacksmith-architecture.md"
        - "blacksmith-file-tree.md"
        - "blacksmith-conventions.md"
      dynamic:
        - task summaries tagged with project:blacksmith
    max_sources: 50

  project-aether:
    id: null
    purpose: "Aether litigation intelligence platform knowledge"
    sources:
      permanent:
        - "aether-architecture.md"
        - "aether-data-models.md"
      dynamic:
        - task summaries tagged with project:aether
    max_sources: 50

  # Department history notebooks — one per Intent.md department
  history-engineering:
    id: null
    purpose: "Engineering task history and learned patterns"
    description: >
      Compressed summaries of all engineering tasks: code reviews,
      refactors, builds, debug sessions. Queried for prerequisites.
    sources:
      dynamic:
        - task summaries where department == "engineering"
    max_sources: 150
    archive:
      strategy: "quarterly_merge"
      keep_recent: 100
      merge_older_than_days: 60

  history-research:
    id: null
    purpose: "Research task history — findings, comparisons, evaluations"
    sources:
      dynamic:
        - task summaries where department == "research"
    max_sources: 100
    archive:
      strategy: "quarterly_merge"
      keep_recent: 75
      merge_older_than_days: 60

  history-infra:
    id: null
    purpose: "Infrastructure task history — deployments, configs, diagnostics"
    sources:
      dynamic:
        - task summaries where department == "infrastructure"
    max_sources: 100
    archive:
      strategy: "quarterly_merge"
      keep_recent: 75
      merge_older_than_days: 60

  history-ops:
    id: null
    purpose: "Operations task history — git workflows, CI/CD, automation"
    sources:
      dynamic:
        - task summaries where department == "operations"
    max_sources: 50
    archive:
      strategy: "quarterly_merge"
      keep_recent: 40
      merge_older_than_days: 90

  errors:
    id: null
    purpose: "Error patterns, stack traces, and resolutions"
    description: >
      Every error encountered during task execution, paired with
      its resolution. Queried when a new error appears to check
      if we've seen it before.
    sources:
      dynamic:
        - error summaries from failed/recovered tasks
    max_sources: 100
    archive:
      strategy: "deduplicate_and_merge"
      merge_threshold: 3     # same error 3+ times → merge into single source

  reference:
    id: null
    purpose: "Stable reference material — conventions, guides, snippets"
    sources:
      permanent:
        - "Intent.md"
        - "coding-conventions.md"
        - "git-workflow.md"
        - "naming-conventions.md"
    max_sources: 30
```

### Brain Query Routing

The orchestrator doesn't just pick a model — it picks which notebook(s)
to query. Sometimes one, sometimes multiple. Queries run in parallel.

```javascript
function routeBrainQuery(task, classification) {
  const queries = [];

  // ALWAYS query models notebook for Tier 2 routing
  if (classification.tier === 2) {
    queries.push({
      notebook: 'models',
      query: `Best model for: ${task.type}, complexity: ${classification.complexity}`
    });
  }

  // Query the relevant project notebook if we know the project
  if (task.project) {
    queries.push({
      notebook: `project-${task.project}`,
      query: `Relevant context for: ${task.description}`
    });
  }

  // Query the relevant department history for prerequisites
  if (classification.department) {
    queries.push({
      notebook: `history-${classification.department}`,
      query: `Past tasks related to: ${task.description}. What prerequisites?`
    });
  }

  // If the task involves an error, check the error notebook
  if (classification.hasError || task.type === 'debug') {
    queries.push({
      notebook: 'errors',
      query: `Have we seen this before? ${task.errorSignature || task.description}`
    });
  }

  // For output-producing tasks, check conventions
  if (['build', 'refactor', 'commit'].includes(task.type)) {
    queries.push({
      notebook: 'reference',
      query: `Relevant conventions for: ${task.type}`
    });
  }

  return queries;  // Executed in parallel via Promise.allSettled
}
```

### Query Routing Examples

**Simple: `blacksmith commit`**
```
Tier 1 (pattern match) → Ollama, no brain query needed
Notebooks queried: 0
```

**Medium: `blacksmith review src/api/auth.js`**
```
Tier 2 queries (parallel):
  1. models             → "Best model for code review, ~3K tokens"
  2. project-blacksmith      → "Context for src/api/auth.js"
  3. history-engineering → "Past reviews of auth.js, auth patterns"
  4. reference          → "Code review conventions"
```

**Complex: `blacksmith debug "ECONNREFUSED when calling Ollama from Docker"`**
```
Tier 2 queries (parallel):
  1. models       → "Best model for debugging Docker networking"
  2. errors       → "ECONNREFUSED Ollama Docker — seen before?"
  3. history-infra → "Past Docker networking tasks"
  4. project-blacksmith → "How does Blacksmith connect to Ollama?"

If errors notebook returns a match:
  → Skip expensive debugging, surface the known fix
  → "We hit this on 2/14. Fix: use host.docker.internal instead of localhost"
  → Cost: ~$0.001 (just the notebook queries)
```

### Teardown → Notebook Routing

Completed task summaries route to the RIGHT notebook(s):

```javascript
function routeTeardown(taskSummary) {
  const targets = [];

  // Always goes to department history
  targets.push(`history-${taskSummary.department}`);

  // Goes to project notebook if project-scoped
  if (taskSummary.project) {
    targets.push(`project-${taskSummary.project}`);
  }

  // Goes to errors notebook if errors were encountered
  if (taskSummary.errorsEncountered.length > 0) {
    targets.push('errors');
  }

  // Goes to models notebook if we learned about model performance
  if (taskSummary.escalated || taskSummary.modelPerformanceNote) {
    targets.push('models');
  }

  return targets;
}
```

### NotebookLM Access — Two Paths

**Path A: notebooklm-mcp-cli (Recommended for Phase 1)**
- Works with free/Pro NotebookLM accounts
- CLI + MCP server in one package
- No GCP billing required
- Community-maintained

```bash
pip install notebooklm-mcp-cli --break-system-packages
nlm login
nlm notebook create "Blacksmith Brain - Models"
nlm source add <notebook_id> --file ./model-capabilities.md
```

**Path B: NotebookLM Enterprise API (Future / Scale)**
- Requires Google Cloud project + billing
- Official API (alpha, Discovery Engine v1alpha)
- Better for production / high-volume / automation

**Recommendation**: Start with Path A. Migrate to Path B when you need
reliability guarantees or hit rate limits.

### Notebook Lifecycle Management

```
CREATE    → `blacksmith brain init` or `blacksmith brain project add`
SEED      → Permanent sources loaded (benchmarks, Intent.md)
GROW      → Task teardowns push summaries to relevant notebooks
MONITOR   → `blacksmith brain health` checks source counts + staleness
ARCHIVE   → Quarterly: merge old summaries into compressed docs
            Errors: deduplicate repeated patterns
REFRESH   → Weekly: re-scrape benchmarks. Monthly: check pricing.
RETIRE    → `blacksmith brain project archive <name>` (export + delete)
```

### Scaling: When You Hit NotebookLM Limits

Free/Pro NotebookLM: ~50 sources per notebook, ~50 notebooks
Enterprise: higher limits, API access

If you outgrow free tier:

1. Aggressive archiving (quarterly merges keep source counts low)
2. Enterprise tier (if the value justifies the GCP cost)
3. Replace NotebookLM with self-hosted RAG (ChromaDB + Ollama embeddings)
   — same notebook topology, same query routing, different backend
   — the abstraction layer means swapping is a backend change, not an architecture change

---

## 5. Model Capability Registry (MCR)

The MCR defines what each model is good at, what it costs, and when to use it.
It lives as a source in the `models` NotebookLM notebook AND as a local YAML
file for Tier 1 pattern matching (zero LLM cost lookups).

Location: `~/.blacksmith/mcr.yaml` (local) + `models` notebook (Brain)

```yaml
# ~/.blacksmith/mcr.yaml — Model Capability Registry

models:
  claude-code:
    provider: anthropic
    access: cli
    context_window: 200000
    strengths:
      - agentic_code_editing
      - architecture_reasoning
      - debugging_complex
      - infrastructure_precision
      - safety_critical
    weaknesses:
      - cost_per_token
      - bulk_reading
    cost:
      input_per_1m: 3.00
      output_per_1m: 15.00
    speed: medium
    best_for:
      - "refactor multi-file codebase"
      - "debug production issue"
      - "design system architecture"
      - "write infrastructure as code"

  gemini-2.5-pro:
    provider: google
    access: cli
    context_window: 1048576
    strengths:
      - deep_reasoning
      - long_context_analysis
      - research_synthesis
      - orchestration
      - code_generation
      - cost_efficiency
    weaknesses:
      - agentic_file_editing
    cost:
      input_per_1m: 1.25
      output_per_1m: 10.00
    speed: medium
    best_for:
      - "research and compare technologies"
      - "analyze large codebase"
      - "synthesize multiple documents"
      - "novel problem requiring creative reasoning"

  gemini-2.5-flash:
    provider: google
    access: cli
    context_window: 1048576
    strengths:
      - speed
      - cost_efficiency
      - summarization
      - classification
    weaknesses:
      - complex_reasoning
      - precision_tasks
    cost:
      input_per_1m: 0.15
      output_per_1m: 0.60
    speed: fast
    best_for:
      - "quick classification"
      - "summarize document"
      - "triage issues"

  ollama-qwen2.5-coder:
    provider: local
    access: http
    context_window: 32768
    strengths:
      - zero_cost
      - privacy
      - speed
      - simple_code
      - commit_messages
      - quick_answers
    weaknesses:
      - complex_reasoning
      - long_context
      - multi_file
    cost:
      input_per_1m: 0.00
      output_per_1m: 0.00
    speed: fastest
    best_for:
      - "generate commit message"
      - "explain this regex"
      - "simple code snippet"
      - "quick factual question"

  ollama-deepseek-r1:
    provider: local
    access: http
    context_window: 65536
    strengths:
      - zero_cost
      - reasoning
      - code_analysis
      - math
    weaknesses:
      - speed
      - very_complex_tasks
    cost:
      input_per_1m: 0.00
      output_per_1m: 0.00
    speed: medium
    best_for:
      - "analyze algorithm complexity"
      - "debug logic error locally"
      - "explain technical concept"

  codex-cli:
    provider: openai
    access: cli
    context_window: 200000
    strengths:
      - fast_scaffolding
      - boilerplate
      - prototyping
    weaknesses:
      - deep_reasoning
    cost:
      input_per_1m: 2.50
      output_per_1m: 10.00
    speed: fast
    best_for:
      - "scaffold new project"
      - "generate boilerplate"
      - "quick prototype"

  jules-cli:
    provider: google
    access: cli
    context_window: null
    strengths:
      - async_execution
      - background_tasks
      - github_integration
    weaknesses:
      - interactive
      - speed
    cost:
      input_per_1m: null
      output_per_1m: null
    speed: slow
    best_for:
      - "fix this GitHub issue in the background"
      - "create PR for this feature"
      - "async code review"

routing_principles:
  - "Always try local (Ollama) first for tasks under 4K context that don't require frontier reasoning"
  - "Use Gemini Flash for classification and triage — it's 20x cheaper than Pro"
  - "Reserve Claude Code for tasks where precision has financial or safety consequences"
  - "Use Gemini Pro for novel/undefined problems — its parallel thinking excels at exploration"
  - "Jules is for async only — never block the user waiting for Jules"
  - "If a task could be handled by two models, pick the cheaper one and escalate if quality is low"
  - "The orchestrator itself should run on Gemini Flash (cheap, fast) not Pro"

last_updated: "2026-02-26"
benchmark_sources:
  - "https://lmarena.ai"
  - "https://livebench.ai"
  - "https://www.artificial-analysis.ai"
```

---

## 6. Orchestrator Design

The orchestrator is intentionally thin and cheap. Two tiers ensure most
commands cost nothing to route, and complex ones get brain-assisted routing.

### Two-Tier Orchestration

```
Tier 1: Pattern Matching (zero LLM cost)
├── "blacksmith commit" → always Ollama, always commit-message pattern
├── "blacksmith ask --backend X" → direct passthrough, no routing needed
├── "blacksmith brain <query>" → NotebookLM direct query
├── Known command + simple args → deterministic routing via MCR
└── Everything else → Tier 2

Tier 2: Brain-Assisted Classification
├── Query relevant NotebookLM notebooks (parallel)
├── Analyze task description against Brain results
├── Determine department (from Intent.md)
├── Estimate context size
├── Determine if sub-agents are needed
├── Generate agent spec
└── Route to execution
```

**Tier 1 handles ~60% of commands with ZERO additional token cost.**

### Orchestrator Prompt (Tier 2)

For ambiguous tasks, this is what gets sent to classify and route:

```markdown
You are a task router for an AI development CLI. Given a user's task:

1. Classify the task type and complexity
2. Determine which department (per Intent.md) owns this
3. Determine what context is needed
4. Select the best model based on Brain query results
5. Generate a minimal agent specification

RULES:
- Prefer local models (Ollama) when they can handle the task
- Minimize context — only include files/data the agent actually needs
- The agent spec should be the MINIMUM effective prompt, not comprehensive
- If the task is simple enough for pattern matching, say so

Intent.md Departments: {departments_summary}
Brain Query Results: {brain_results}
User's current project context: {project_summary}
Task: {user_input}

Respond with JSON: { classification, department, context_needed, agent_spec, model, rationale }
```

---

## 7. Dynamic Agent Assembly

Instead of static prompt templates, the orchestrator generates a complete
agent specification per task. This is the heart of the architecture.

### What Gets Generated

When you run `blacksmith review src/api/auth.js`:

**Step 1: Classification** (~100 tokens via Gemini Flash)
```json
{
  "task_type": "code_review",
  "department": "engineering",
  "complexity": "medium",
  "context_needed": ["file:src/api/auth.js", "git:recent_changes", "project:package.json"],
  "estimated_context_tokens": 3200,
  "sub_agents_needed": 0,
  "model_recommendation": "gemini-2.5-pro",
  "rationale": "Code review of single file, Gemini Pro is cost-efficient for bulk reading"
}
```

**Step 2: Brain Query** (parallel notebook queries)

Results come back from `models`, `project-blacksmith`, `history-engineering`, `reference`

**Step 3: Agent Spec Generation** (~300 tokens via Gemini Flash)

```yaml
# EPHEMERAL — generated at runtime, torn down after
soul:
  identity: "Senior code reviewer specializing in Node.js authentication patterns"
  tone: "direct, constructive, security-focused"
  constraints:
    - "Focus on security vulnerabilities first, then correctness, then style"
    - "Flag any hardcoded secrets or insecure token handling"
    - "Reference OWASP Top 10 where applicable"

prerequisites:  # Injected from NotebookLM query results
  prior_knowledge:
    - "Previous review identified JWT expiry check missing (2026-02-26)"
    - "Auth module currently has zero test coverage"
  relevant_patterns:
    - "Express 4 middleware pattern in use"
    - "Environment variables used for secrets"

context:
  files:
    - path: "src/api/auth.js"
      role: "primary review target"
    - path: "package.json"
      role: "dependency context"
  git:
    - recent_changes: true
    - blame: "src/api/auth.js"

skills:
  - name: "file_read"
  - name: "git_log"

output:
  format: "structured_review"
  sections:
    - "Security Issues (critical → low)"
    - "Correctness Issues"
    - "Suggestions"
    - "Summary Verdict"

runtime:
  model: "gemini-2.5-pro"
  max_tokens: 4000
  temperature: 0.2
  timeout: 30s
```

**Step 4: Context Assembly** (reads actual files, git data)

**Step 5: Execute** (sends assembled prompt + context to selected model)

**Step 6: Post-execution** (compress → push to Brain → ledger → teardown)

### Why This Is Better

| Approach | Context Tokens | Quality | Cost |
|----------|---------------|---------|------|
| Static template (v1) | ~8,000 (generic) | Medium | Higher |
| OpenClaw-style (SOUL + AGENTS + memory + all skills) | ~15,000+ | Medium-High (noisy) | Highest |
| Blacksmith dynamic assembly | ~500 orchestrator + ~2,000 precise agent | High (targeted) | Lowest |

---

## 8. Sub-Agent Architecture

For complex tasks, the primary agent spawns sub-agents. Each gets its OWN
generated spec — minimal, focused, ephemeral. No shared context waste.

### Example: "Blacksmith, refactor the auth module to use OAuth2"

```
Orchestrator (Gemini Flash)
├── Classifies as: complex refactor, multi-file, needs planning
├── Department: Engineering
├── Selects: Claude Code (agentic file editing)
├── Generates agent spec with sub-agent definitions:
│
└── Primary Agent (Claude Code): "Auth Module Refactor Lead"
    ├── Sub-Agent 1 (Gemini Pro): "Research current OAuth2 best practices"
    │   └── Returns: structured findings (compressed)
    ├── Sub-Agent 2 (Ollama): "Analyze current auth.js for all entry points"
    │   └── Returns: function map + dependency graph
    ├── Sub-Agent 3 (Claude Code): "Generate refactoring plan"
    │   └── Returns: step-by-step plan with file changes
    │
    │   [Human checkpoint: "Here's the plan. Proceed?"]
    │
    ├── Sub-Agent 4 (Claude Code): "Execute step 1: Install OAuth2 deps"
    ├── Sub-Agent 5 (Claude Code): "Execute step 2: Refactor token handling"
    ├── Sub-Agent 6 (Ollama): "Generate tests for new OAuth2 flow"
    ├── Sub-Agent 7 (Gemini Pro): "Review all changes for security issues"
    │
    └── Final: Compress results, generate summary, commit (if approved)
```

Each sub-agent is isolated. Sub-Agent 1 doesn't carry the context of
Sub-Agent 3. Different models handle different steps based on what each
step actually requires.

---

## 9. Ephemeral Agent Lifecycle

```
                    ┌─────────┐
                    │ SCAFFOLD │ Orchestrator generates agent spec
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ HYDRATE │ Load context (files, git, prerequisites)
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │ EXECUTE │ Run agentic loop against selected model
                    └────┬────┘
                         │
                    ┌────▼─────┐
                    │ COMPRESS │ Strip reasoning, extract actionable output
                    └────┬─────┘
                         │
                    ┌────▼────┐
                    │  STORE  │ Route summary to correct NotebookLM notebook(s)
                    │         │ Log metadata to SQLite ledger
                    └────┬────┘
                         │
                    ┌────▼─────┐
                    │ TEARDOWN │ Agent spec is ephemeral — deleted
                    └──────────┘
```

---

## 10. Task Teardown & Prerequisites System

Every completed task generates a compressed summary that routes to the
correct NotebookLM notebook(s). Future tasks query these summaries for
prerequisites, creating a compounding knowledge effect.

### Teardown Flow

```
Task Completes
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│  1. COMPRESS OUTPUT                                          │
│     - Strip reasoning/thinking tokens                        │
│     - Extract: decisions, tools used, errors, patterns,      │
│       files modified, outcome                                │
│     - Format as structured markdown (~200-500 tokens)        │
│                                                              │
│  2. GENERATE TASK SUMMARY (/compact style)                   │
│     ┌────────────────────────────────────────────────────┐  │
│     │ ## Task: Code Review - src/api/auth.js              │  │
│     │ **Date**: 2026-02-26 14:32 EST                      │  │
│     │ **Model Used**: gemini-2.5-pro                      │  │
│     │ **Tokens**: 2,847 in / 1,203 out ($0.014)          │  │
│     │ **Project**: blacksmith  |  **Dept**: engineering        │  │
│     │                                                      │  │
│     │ ### Decisions                                        │  │
│     │ - JWT validation was missing expiry check            │  │
│     │ - Recommended switching from HS256 to RS256          │  │
│     │                                                      │  │
│     │ ### Patterns Discovered                              │  │
│     │ - This codebase uses Express 4 middleware pattern    │  │
│     │ - Auth module has no test coverage                   │  │
│     │                                                      │  │
│     │ ### Prerequisites for Follow-up                      │  │
│     │ - Need to generate RSA key pair before refactor      │  │
│     │ - Test framework needs setup (jest not installed)    │  │
│     │                                                      │  │
│     │ ### Tags                                             │  │
│     │ security, authentication, jwt, express, code-review  │  │
│     └────────────────────────────────────────────────────┘  │
│                                                              │
│  3. ROUTE TO NOTEBOOKS                                       │
│     → history-engineering (task record)                      │
│     → project-blacksmith (auth.js knowledge)                     │
│     → errors (if any errors hit)                            │
│     → models (if model escalation occurred)                 │
│                                                              │
│  4. LOG TO SQLITE LEDGER                                     │
│     (tokens, cost, duration, model, task type, tags)        │
│                                                              │
│  5. TEARDOWN AGENT SPEC                                      │
└─────────────────────────────────────────────────────────────┘
```

### How Prerequisites Work

When a NEW task comes in, the orchestrator queries relevant notebooks.
Results become the `prerequisites` section injected into the agent spec.

```
User: "blacksmith refactor src/api/auth.js to use OAuth2"

Orchestrator queries history-engineering + project-blacksmith:
  → Previous review found missing JWT expiry check
  → Auth module has no test coverage
  → Codebase uses Express 4 middleware pattern
  → Need RSA key pair before refactor

These become prerequisites in the ephemeral agent spec,
so the refactoring agent starts with FULL CONTEXT of what's
already been discovered — without the user re-explaining.
```

### Memory Rules

Not everything gets stored. The orchestrator decides:

```yaml
always_store:
  - "Architecture decisions and rationale"
  - "User preferences discovered during interaction"
  - "Project structure maps"
  - "Error patterns and their resolutions"

never_store:
  - "Raw model reasoning/thinking tokens"
  - "Boilerplate code generation"
  - "Simple factual lookups"

compress_then_store:
  - "Research findings → key conclusions + sources"
  - "Code reviews → issues found + recommendations"
  - "Debug sessions → root cause + fix applied"
```

---

## 11. The Compounding Loop

```
     ┌──────────────────────────────────────┐
     │                                      │
     │   Task 1 → Teardown → Brain learns   │
     │                           │           │
     │   Task 2 → Prerequisites │           │
     │            from Task 1    │           │
     │            → Teardown ────┘           │
     │                           │           │
     │   Task 3 → Prerequisites │           │
     │            from Tasks 1+2 │           │
     │            → Teardown ────┘           │
     │                           │           │
     │   Task N → Prerequisites │           │
     │            from ALL past   │           │
     │            relevant tasks  │           │
     │            → Teardown ────┘           │
     │                                      │
     └──────────────────────────────────────┘

     The Brain accumulates. Every task makes the next one smarter.
```

Week 1: Routes based on MCR benchmark data.
Week 4: Routes based on benchmarks + 200 task summaries.
Month 3: Knows YOUR codebase, YOUR patterns, YOUR preferences,
         YOUR error tendencies — all grounded in actual execution history.

No other tool does this. OpenClaw loads static memory files.
Superpowers enforces static workflows. Blacksmith GROWS.

---

## 12. Token Economics

### Scenario: Code Review of 500-line file

**Static Template Approach (v1 / OpenClaw-style):**
```
System prompt:          ~3,000 tokens (generic review instructions)
Skills/tools:           ~2,000 tokens (all skills loaded, most unused)
Memory context:         ~2,000 tokens (full conversation history)
File content:           ~2,000 tokens (the actual file)
─────────────────────────────────────────────
Total input:            ~9,000 tokens → ~$0.027 (Gemini Pro)
Output:                 ~1,500 tokens → ~$0.015
TOTAL:                  ~$0.042
```

**Blacksmith Dynamic Assembly:**
```
Orchestrator (Tier 1):  0 tokens (pattern match: "review" → code_review)
Agent spec generation:  ~200 tokens via Gemini Flash → ~$0.00003
Brain queries:          ~400 tokens total → ~$0.0001
Context assembly:       ~2,000 tokens (file + relevant git + prerequisites)
Agent system prompt:    ~300 tokens (generated, precise)
─────────────────────────────────────────────
Total input:            ~2,900 tokens → ~$0.004 (Gemini Pro)
Output:                 ~1,000 tokens → ~$0.010 (more focused = shorter)
TOTAL:                  ~$0.014
```

**Savings: ~67% per code review.** Scale across hundreds of daily interactions.

### Token Ledger Schema

```sql
CREATE TABLE usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  backend TEXT NOT NULL,
  model TEXT,
  workflow TEXT,
  department TEXT,
  command TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT 1,
  escalated BOOLEAN DEFAULT 0,
  session_id TEXT,
  project TEXT
);

CREATE TABLE daily_summary (
  date TEXT PRIMARY KEY,
  total_tokens INTEGER,
  total_cost REAL,
  calls_by_backend TEXT,
  calls_by_workflow TEXT,
  calls_by_department TEXT
);

CREATE INDEX idx_usage_timestamp ON usage(timestamp);
CREATE INDEX idx_usage_backend ON usage(backend);
CREATE INDEX idx_usage_workflow ON usage(workflow);
CREATE INDEX idx_usage_project ON usage(project);
```

---

## 13. Ecosystem Borrowing

### From OpenClaw (the agent spec model)
**Take:** The SOUL.md / AGENTS.md / memory structure as a *pattern*
**Change:** Generate it per-task instead of maintaining it statically
**Skip:** Persistent daemon, messaging platforms, broad permissions,
gateway architecture, community skill marketplace

### From Superpowers (the workflow methodology)
**Take:**
- Git worktrees for isolated development branches
- Subagent-driven development (dispatch fresh agent per task step)
- Two-stage review (spec compliance → code quality)
- Mandatory design → plan → implement flow for complex tasks
- Context-triggered skill activation

**Change:**
- Skills are generated per-task, not stored as static .md files
- Worktrees are spun up/down programmatically by the orchestrator
- Review stages use different models (cheap for spec, expensive for quality)

**Skip:** Claude Code plugin system, marketplace model

### From Research (model routing)
**Take:**
- RouterEval's finding that routing LLMs outperform single-model approaches
- Intent descriptions > terse labels for tool selection accuracy
- Cost-aware routing (40-60% savings from task-based model selection)

---

## 14. CLI Commands

### Core Workflows

```bash
# Coding
blacksmith build "REST API endpoint for user authentication using JWT"
blacksmith debug "TypeError: cannot read property 'map' of undefined"
blacksmith debug --file src/api/auth.js
blacksmith review src/api/auth.js
blacksmith review --staged
blacksmith review --pr 42
blacksmith refactor src/api/ --goal "extract shared middleware"
blacksmith commit
blacksmith commit --conventional

# Research
blacksmith research "Kubernetes vs Nomad for homelab orchestration"
blacksmith compare "Traefik" "Caddy" "Nginx Proxy Manager" --for "homelab reverse proxy"
blacksmith summarize https://arxiv.org/abs/2401.12345
blacksmith summarize ./docs/long-report.md

# Infrastructure
blacksmith deploy --env staging
blacksmith diagnose "container keeps restarting"
blacksmith diagnose --logs docker
blacksmith provision "new VLAN for IoT devices on UniFi"
```

### Brain Commands

```bash
# Query (auto-routed to correct notebooks)
blacksmith brain "how should I refactor the auth module?"
blacksmith brain "which model handles PDF parsing best?"

# Query specific notebook
blacksmith brain ask models "cheapest model for summarization"
blacksmith brain ask errors "ECONNREFUSED Docker Ollama"
blacksmith brain ask project-blacksmith "current auth architecture"

# Manage
blacksmith brain init                        # create all notebooks
blacksmith brain list                        # show notebooks + source counts
blacksmith brain sources models              # list sources in specific notebook
blacksmith brain add project-blacksmith ./doc.md  # add source to notebook
blacksmith brain project add campaignos      # create new project notebook
blacksmith brain archive history-engineering # trigger archive cycle
blacksmith brain refresh                     # re-scrape benchmark sources
blacksmith brain health                      # source counts, staleness, warnings
```

### Meta Commands

```bash
# Spend tracking
blacksmith spend
blacksmith spend --week
blacksmith spend --by-backend
blacksmith spend --by-workflow
blacksmith spend --by-department

# Configuration
blacksmith config set default-model ollama:qwen2.5-coder:7b
blacksmith config show

# MCR management
blacksmith mcr show
blacksmith mcr show --model claude-code
blacksmith mcr compare claude-code gemini-2.5-pro --for "code review"
blacksmith mcr edit
blacksmith mcr update                        # semi-automated benchmark scrape

# Project mapping
blacksmith map                               # auto-generate file tree in Intent.md

# Raw passthrough (escape hatch)
blacksmith ask "what does this regex do: ^(?=.*[A-Z])(?=.*\d).{8,}$"
blacksmith ask --backend claude "explain this architecture decision"
blacksmith ask --backend ollama "quick: default port for Redis?"
```

---

## 15. Directory Structure & Config

### File System

```
~/.blacksmith/
├── config.yaml              # Global config
├── brain.yaml               # Notebook registry (IDs, routing, limits)
├── mcr.yaml                 # Model Capability Registry (local copy)
├── Intent.md                # Organizational DNA (you write this)
├── OrchestratorPrompt.md    # Orchestrator behavior (system + you tune)
├── ledger.db                # SQLite — token usage, costs
├── sessions/                # Active session state (ephemeral)
│   └── {session-id}.json
└── logs/                    # Optional debug logs

# NotebookLM notebooks (managed remotely, referenced by ID in brain.yaml):
# - models
# - project-blacksmith, project-aether, project-campaignos, project-eola-gateway
# - history-engineering, history-research, history-infra, history-ops
# - errors
# - reference

~/blacksmith/                     # The CLI source
├── package.json
├── bin/
│   └── blacksmith.js             # Entry point
├── src/
│   ├── cli.js               # Commander setup, command registration
│   ├── orchestrator/
│   │   ├── index.js          # Main orchestration pipeline
│   │   ├── classifier.js     # Tier 1 (pattern match) + Tier 2 (Brain)
│   │   ├── agent-assembler.js # Dynamic agent spec generation
│   │   ├── context-loader.js  # File, git, prerequisite assembly
│   │   └── cost-estimator.js  # Pre-execution cost estimation
│   ├── brain/
│   │   ├── index.js           # NotebookLM client wrapper
│   │   ├── router.js          # Query routing (task → notebooks)
│   │   ├── teardown-router.js # Summary routing (output → notebooks)
│   │   └── archive.js         # Lifecycle management (archive, refresh)
│   ├── mcr/
│   │   ├── index.js           # MCR loader + query interface
│   │   ├── updater.js         # Semi-automated MCR updates
│   │   └── comparator.js      # Model comparison logic
│   ├── agents/
│   │   ├── runner.js          # Executes generated agent specs
│   │   ├── sub-agent.js       # Sub-agent dispatch and coordination
│   │   └── lifecycle.js       # Scaffold → Hydrate → Execute → Compress → Store → Teardown
│   ├── backends/
│   │   ├── claude.js          # Spawns `claude` CLI
│   │   ├── gemini.js          # Spawns `gemini` CLI
│   │   ├── codex.js           # Spawns `codex` CLI
│   │   ├── jules.js           # Spawns `jules` CLI
│   │   ├── ollama.js          # HTTP to localhost:11434
│   │   └── github.js          # Spawns `gh` CLI
│   ├── ledger/
│   │   ├── tracker.js         # Real-time token tracking
│   │   └── reporter.js        # Spend analysis and reporting
│   └── utils/
│       ├── config.js          # Config loader
│       ├── spinner.js         # Terminal UX
│       └── git.js             # Git worktree management
└── test/
```

### Global Config

```yaml
# ~/.blacksmith/config.yaml

version: 1

backends:
  ollama:
    enabled: true
    host: "http://localhost:11434"
    default_model: "qwen2.5-coder:7b"
    models:
      code: "qwen2.5-coder:7b"
      general: "llama3.1:8b"
      reasoning: "deepseek-r1:7b"

  claude:
    enabled: true
    default_model: "sonnet"
    max_monthly_spend: 50.00

  gemini:
    enabled: true
    default_model: "gemini-2.5-pro"

  codex:
    enabled: true

  jules:
    enabled: true

  github:
    enabled: true

routing:
  overrides:
    commit-message: ollama
    code-review: gemini
    architecture: claude
  cost_warning_threshold: 0.50
  cost_hard_stop: 2.00
  auto_escalate: true
  escalation_threshold: 0.6

brain:
  provider: "notebooklm-mcp-cli"   # or "enterprise-api"
  refresh:
    benchmarks: "weekly"
    pricing: "monthly"
    task_archive: "quarterly"

ledger:
  enabled: true
  db_path: "~/.blacksmith/ledger.db"
  daily_summary: true
  retention_days: 90

context:
  max_context:
    ollama: 4000
    claude: 100000
    gemini: 500000
    codex: 32000
  exclude:
    - "node_modules/**"
    - ".git/**"
    - "*.lock"
    - "dist/**"
    - "build/**"

logging:
  level: "info"
  save_interactions: false
```

---

## 16. Build Order

### Phase 1: The Spine (Day 1-3)
- [ ] Initialize Node.js project with Commander
- [ ] Config loader (YAML)
- [ ] MCR loader (local YAML) + `blacksmith mcr show`
- [ ] Backend wrappers: Ollama HTTP + Claude CLI spawn
- [ ] `blacksmith ask` — raw passthrough with basic MCR routing
- [ ] Basic ledger (log every call to SQLite)
- [ ] Install `notebooklm-mcp-cli`, authenticate
- [ ] Create initial notebooks via `blacksmith brain init`
- [ ] Seed `models` notebook with MCR data
- [ ] `blacksmith brain <query>` — direct NotebookLM query

**You'll have**: A CLI that routes questions to the right model and can
query NotebookLM notebooks from the terminal.

### Phase 2: The Identity (Day 4-5)
- [ ] Write Intent.md (your org DNA)
- [ ] Write initial OrchestratorPrompt.md
- [ ] Intent.md parser (extract departments, values, principles)
- [ ] Wire Intent.md into agent assembly (department → agent soul)
- [ ] `blacksmith map` — auto-generate file tree section of Intent.md

**You'll have**: The organizational DNA that every agent inherits from.

### Phase 3: The Brain (Day 6-10)
- [ ] Tier 1 classifier (pattern matching, zero LLM cost)
- [ ] Tier 2 classifier (Brain-assisted via multi-notebook queries)
- [ ] Brain query router (task → which notebooks to query)
- [ ] Dynamic agent assembler (generates per-task specs from Brain + Intent)
- [ ] Agent runner (executes specs against backends)
- [ ] Wire up remaining backends (Gemini, Codex, Jules, GitHub)
- [ ] Task Teardown pipeline:
  - Output compression
  - Summary generation
  - Route to correct notebook(s)
  - Ledger logging
- [ ] Prerequisites generation (Brain query → prerequisites in agent spec)
- [ ] Core commands: `blacksmith build`, `blacksmith review`, `blacksmith debug`

**You'll have**: Smart orchestration with compounding knowledge. Each task
makes the next one smarter.

### Phase 4: The Swarm (Week 3)
- [ ] Sub-agent dispatch and coordination
- [ ] Git worktree integration (isolated branches per task)
- [ ] Multi-step workflow execution with human checkpoints
- [ ] Two-stage review (from Intent.md Engineering department config)
- [ ] `blacksmith refactor` with full sub-agent pipeline
- [ ] Jules CLI integration for async background tasks
- [ ] Escalation logic (cheap → expensive, auto)
- [ ] `blacksmith commit` with Ollama

**You'll have**: Agents that build agents that do work in parallel.

### Phase 5: Polish & Self-Improvement (Week 4+)
- [ ] Routing performance analysis (every 50 tasks)
- [ ] OrchestratorPrompt.md auto-suggestions
- [ ] Tier 1 pattern learning (promote frequent Tier 2 routes)
- [ ] Notebook archive automation (quarterly merge)
- [ ] `blacksmith brain health` and `blacksmith brain refresh`
- [ ] MCR semi-automated update (`blacksmith mcr update`)
- [ ] Spend visualization (React dashboard)
- [ ] Research workflows: `blacksmith research`, `blacksmith compare`, `blacksmith summarize`
- [ ] Alternative Intent.md profiles (coding vs campaign vs grants)

**You'll have**: A self-improving system that learns from its own routing
decisions and compounds institutional knowledge.

---

## 17. Domain Agnosticism

The architecture doesn't assume coding. Intent.md defines the departments.
Change the departments, change the system.

**For a Political Campaign (CampaignOS):**
```markdown
## Departments

### Communications
- Focus: Speeches, press releases, social media, messaging
- Default models: Claude Code (writing), Gemini Pro (research)

### Policy Research
- Focus: Issue analysis, position papers, competitor analysis
- Default models: Gemini Pro (deep research), Gemini Flash (summaries)

### Voter Outreach
- Focus: Canvassing scripts, email campaigns, event planning
- Default models: Gemini Flash (high volume), Ollama (templates)

### Data & Analytics
- Focus: Polling analysis, demographic mapping, fundraising metrics
- Default models: Claude Code (analysis), Ollama (data formatting)
```

**For Grant Management (Orlando Science Center):**
```markdown
## Departments

### Grants Compliance
- Focus: Expenditure tracking, reporting, regulatory alignment
- Default models: Claude Code (precision), Gemini Pro (regulatory research)

### Proposal Development
- Focus: Grant writing, narrative development, budget justification
- Default models: Claude Code (writing), Gemini Flash (outline generation)

### Stakeholder Relations
- Focus: Communication drafts, meeting prep, impact summaries
- Default models: Gemini Flash (drafts), Ollama (quick templates)
```

Same Blacksmith. Same orchestrator. Same agent lifecycle.
Different Intent.md = different system.

---

## 18. What This Is NOT

- **Not a chat interface.** You have five of those already.
- **Not a token-burning "AI assistant."** Every call has a purpose.
- **Not a framework.** It's YOUR tool. Modify it, don't extend it.
- **Not trying to replace your IDE.** It complements your workflow.
- **Not an abstraction for abstraction's sake.** If `gh pr list` works, use it.
- **Not a persistent daemon.** It runs when you call it and exits.
- **Not a product.** It's a workshop.

---

## Naming

**Blacksmith** — you shape the tools, the tools shape the work.

The metaphor fits the architecture: purpose-built agents forged in the
heat of the moment, cooled down, refined output stored, mold destroyed.

Rename it to whatever fits your ecosystem. The binary is `blacksmith`, the
config lives in `~/.blacksmith/`, the source lives wherever you want it.
