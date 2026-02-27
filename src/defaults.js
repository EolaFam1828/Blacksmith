export const DEFAULT_CONFIG = `version: 1

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
    max_monthly_spend: 50.0

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
  cost_warning_threshold: 0.5
  cost_hard_stop: 2.0
  auto_escalate: true
  escalation_threshold: 0.6

brain:
  provider: "local"
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
`;

export const DEFAULT_MCR = `models:
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
      input_per_1m: 3.0
      output_per_1m: 15.0
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
      output_per_1m: 10.0
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
      output_per_1m: 0.6
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
      input_per_1m: 0.0
      output_per_1m: 0.0
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
      input_per_1m: 0.0
      output_per_1m: 0.0
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
      input_per_1m: 2.5
      output_per_1m: 10.0
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

  github-cli:
    provider: github
    access: cli
    context_window: null
    strengths:
      - native_git_ops
      - pull_request_metadata
      - repository_context
    weaknesses:
      - reasoning
      - code_generation
    cost:
      input_per_1m: 0.0
      output_per_1m: 0.0
    speed: fast
    best_for:
      - "inspect pull request metadata"
      - "read pull request diffs"
      - "native repository operations"

routing_principles:
  - "Always try local (Ollama) first for tasks under 4K context that don't require frontier reasoning"
  - "Use Gemini Flash for classification and triage - it is much cheaper than Pro"
  - "Reserve Claude Code for tasks where precision has financial or safety consequences"
  - "Use Gemini Pro for novel or undefined problems"
  - "Jules is for async only"
  - "If a task could be handled by two models, pick the cheaper one and escalate if quality is low"
  - "The orchestrator itself should run on Gemini Flash"

last_updated: "2026-02-26"
benchmark_sources:
  - "https://lmarena.ai"
  - "https://livebench.ai"
  - "https://www.artificial-analysis.ai"
`;

export const DEFAULT_INTENT = `# Intent.md - Blacksmith System Identity

## Mission
Build and maintain high-quality software systems with maximum efficiency
and minimum waste. Every token spent should produce measurable value.

## Vision
A personal AI development environment that compounds knowledge over time,
making each interaction smarter than the last. Not a product - a workshop.

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
- Context is king - the right 500 tokens beat the wrong 50,000

## Owner Context
- Name: Jake
- Role: Corporate Development Officer (current), AI Engineer (target)
- Technical depth: Infrastructure, DevOps, AI/ML, full-stack
- Projects: Blacksmith, Aether, CampaignOS, Eola Gateway homelab
- Communication style: Direct, technical, no fluff
- Decision framework: Pragmatic - "does this actually work?"

## Departments (Sub-Agent Architecture)

### Engineering
- **Focus**: Code quality, architecture, debugging, refactoring
- **Default models**: Claude Code (complex), Ollama (simple)
- **Review standard**: Two-stage (spec compliance -> quality)
- **Methodology**: Design -> Plan -> Implement -> Test -> Review

### Research
- **Focus**: Technology evaluation, comparison, synthesis
- **Default models**: Gemini Pro (deep), Gemini Flash (quick)
- **Output standard**: Structured findings with sources
- **Methodology**: Define scope -> Multi-source gather -> Synthesize -> Recommend

### Infrastructure
- **Focus**: Homelab, cloud, networking, deployment, IaC
- **Default models**: Claude Code (IaC), Gemini Pro (troubleshooting)
- **Safety standard**: Human checkpoint before any destructive action
- **Methodology**: Diagnose -> Plan -> Execute -> Verify -> Document

### Operations
- **Focus**: Git workflow, commit messages, PR management, CI/CD
- **Default models**: Ollama (commits), GitHub CLI (native ops)
- **Automation level**: Full auto for commits, human approval for merges
- **Methodology**: Detect change -> Generate -> Validate -> Apply

## File Tree (Project Map)
<!-- Auto-generated by \`blacksmith map\` - updated on each run -->
`;

export const DEFAULT_ORCHESTRATOR_PROMPT = `# OrchestratorPrompt.md - Orchestrator Behavior

## Role
You are the Blacksmith orchestrator. Your job is to classify incoming tasks,
query the Blacksmith Brain (NotebookLM) for relevant context and model selection,
assemble a purpose-built ephemeral agent, and route execution to the right
backend. You are NOT the executor - you are the dispatcher.

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
7. **Teardown** - compress output, push to Brain, log to ledger

## Routing Rules
### Tier 1: Deterministic
- \`blacksmith commit\` -> Ollama (always)
- \`blacksmith ask --backend X\` -> direct passthrough
- \`blacksmith spend\` / \`blacksmith config\` / \`blacksmith brain\` -> internal commands
- Known command + simple args -> deterministic routing

### Tier 2: Brain-Assisted
- Query the Brain with task description + project context
- Brain returns: model recommendation, prerequisites, cost estimate
- Generate ephemeral agent spec from Brain response

## Escalation Rules
- If Ollama response quality < threshold -> re-route to Gemini Flash
- If Gemini Flash insufficient -> escalate to Gemini Pro or Claude
- Never escalate Jules (async-only, escalation does not apply)
- Always inform user when escalating

## Cost Guard
- Warn if single task estimated > $0.50
- Hard stop if estimated > $2.00 (require explicit \`--force\`)
- Daily spend summary auto-generated at midnight

## Human Checkpoints
- ALWAYS require confirmation before:
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
`;

export const DEFAULT_BRAIN_REGISTRY = `version: 1
provider: local
notebooks:
  - name: models
    kind: reference
    file: "~/.blacksmith/notebooks/models.md"
    description: Model capability registry notes
  - name: project-blacksmith
    kind: project
    file: "~/.blacksmith/notebooks/project-blacksmith.md"
    description: Blacksmith project knowledge
  - name: history-engineering
    kind: history
    file: "~/.blacksmith/notebooks/history-engineering.md"
    description: Engineering task summaries
  - name: history-research
    kind: history
    file: "~/.blacksmith/notebooks/history-research.md"
    description: Research task summaries
  - name: history-infrastructure
    kind: history
    file: "~/.blacksmith/notebooks/history-infrastructure.md"
    description: Infrastructure task summaries
  - name: history-operations
    kind: history
    file: "~/.blacksmith/notebooks/history-operations.md"
    description: Operations task summaries
  - name: errors
    kind: error
    file: "~/.blacksmith/notebooks/errors.md"
    description: Repeated failures and fixes
  - name: reference
    kind: reference
    file: "~/.blacksmith/notebooks/reference.md"
    description: Reference snippets and external notes
`;

export const NOTEBOOK_SEEDS = {
  "models.md": "# Models\n\nLocal notebook initialized by Blacksmith.\n",
  "project-blacksmith.md": "# Project Blacksmith\n\nProject-specific context lands here.\n",
  "history-engineering.md": "# History Engineering\n\nTask summaries land here.\n",
  "history-research.md": "# History Research\n\nTask summaries land here.\n",
  "history-infrastructure.md": "# History Infrastructure\n\nTask summaries land here.\n",
  "history-operations.md": "# History Operations\n\nTask summaries land here.\n",
  "errors.md": "# Errors\n\nKnown errors and fixes land here.\n",
  "reference.md": "# Reference\n\nReference notes land here.\n"
};

export const DEFAULT_INTENT_PROFILES = {
  "coding.md": `# Intent.md - Coding Profile

## Mission
Build and maintain high-quality software systems with maximum efficiency and minimum waste.

## Vision
A workshop-first coding environment that compounds implementation knowledge over time.

## Values
- Precision over volume
- Local first
- Transparency
- Composability
- Earned complexity

## Principles
- Ship working code, not perfect architecture
- Measure everything, optimize what matters
- Human checkpoints before destructive actions
- Fail fast, fail cheap
- Context is king

## Owner Context
- Name: Jake
- Role: AI Engineer
- Technical depth: Infrastructure, DevOps, AI/ML, full-stack
- Projects: Blacksmith, Aether, CampaignOS, Eola Gateway homelab
- Communication style: Direct, technical, no fluff
- Decision framework: Pragmatic - "does this actually work?"

## Departments (Sub-Agent Architecture)

### Engineering
- **Focus**: Code quality, architecture, debugging, refactoring
- **Default models**: Claude Code (complex), Ollama (simple)
- **Review standard**: Two-stage (spec compliance -> quality)
- **Methodology**: Design -> Plan -> Implement -> Test -> Review
`,
  "campaign.md": `# Intent.md - Campaign Profile

## Mission
Operate an AI-assisted campaign environment that turns research and outreach into repeatable execution.

## Vision
An institutional brain for campaign operations, communication, and analytics.

## Values
- Precision over volume
- Local first
- Transparency
- Composability
- Earned complexity

## Principles
- Move fast with evidence
- Keep messaging consistent
- Human checkpoints before public-facing output
- Reuse validated patterns
- Context is king

## Owner Context
- Name: Jake
- Role: Campaign strategist
- Technical depth: Operations, analytics, automation
- Projects: Communications, policy research, voter outreach
- Communication style: Direct, technical, no fluff
- Decision framework: Pragmatic - "does this actually work?"

## Departments

### Communications
- **Focus**: Messaging, content, narrative testing
- **Default models**: Gemini Pro (deep), Gemini Flash (quick)
- **Methodology**: Define message -> Draft -> Review -> Revise -> Publish
`,
  "grants.md": `# Intent.md - Grants Profile

## Mission
Run grant and compliance workflows with traceability, consistency, and minimal waste.

## Vision
A repeatable environment for proposal development, compliance, and stakeholder reporting.

## Values
- Precision over volume
- Transparency
- Reuse proven structure
- Human review before submission
- Earned complexity

## Principles
- Be evidence-driven
- Preserve compliance context
- Human checkpoints before external commitments
- Measure throughput and quality
- Context is king

## Owner Context
- Name: Jake
- Role: Grants operator
- Technical depth: Operations, process design, analytics
- Projects: Grants compliance, proposal development, stakeholder relations
- Communication style: Direct, technical, no fluff
- Decision framework: Pragmatic - "does this actually work?"

## Departments

### Grants Compliance
- **Focus**: Compliance checks, reporting, evidence capture
- **Default models**: Gemini Pro (deep), Gemini Flash (quick)
- **Methodology**: Gather -> Validate -> Summarize -> Review -> Submit
`
};
