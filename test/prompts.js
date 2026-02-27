/**
 * Blacksmith E2E Prompt Suite — Prompt Definitions
 *
 * Each entry represents a realistic user task with assertions about
 * how Blacksmith should classify, route, and assemble agents for it.
 *
 * Categories mirror the Blacksmith department model:
 *   - tier1_passthrough    → deterministic routing, no brain/identity
 *   - engineering          → code review, build, debug, refactor
 *   - research             → research, compare, summarize
 *   - infrastructure       → deploy, diagnose, provision
 *   - operations           → commit, PR workflows
 *   - brain                → notebook queries, health, archive
 *   - identity             → intent parsing, profiles, departments
 *   - mcr                  → model registry, comparison
 *   - system               → config, spend, map, routing-report
 *   - escalation           → prompts that should trigger escalation logic
 *   - sub_agents           → prompts that should produce sub-agent plans
 *   - cost_guard           → prompts that exercise cost thresholds
 *   - context_loading      → prompts with file context
 *   - edge_cases           → malformed inputs, boundary conditions
 */

// ─── Tier 1: Deterministic Passthrough ──────────────────────────

export const TIER1_PROMPTS = [
  {
    name: "ask-simple-fact",
    command: "ask",
    args: ["what", "port", "does", "Redis", "use?"],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
      backend: "ollama",
      model: /ollama-qwen2\.5-coder/,
      no_spec: true,
      no_brain: true,
    },
  },
  {
    name: "ask-one-liner",
    command: "ask",
    args: ["explain", "the", "difference", "between", "TCP", "and", "UDP"],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
      backend: "ollama",
      model: /ollama-qwen2\.5-coder/,
    },
  },
  {
    name: "ask-code-snippet",
    command: "ask",
    args: ["write", "a", "python", "fibonacci", "function"],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
      backend: "ollama",
    },
  },
  {
    name: "commit-deterministic",
    command: "commit",
    args: [],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
      backend: "ollama",
      model: /ollama-qwen2\.5-coder/,
    },
  },
  {
    name: "commit-conventional",
    command: "commit",
    args: [],
    flags: ["--dry-run", "--conventional"],
    expect: {
      tier: 1,
      passthrough: true,
      backend: "ollama",
    },
  },
];

// ─── Tier 2: Engineering ────────────────────────────────────────

export const ENGINEERING_PROMPTS = [
  {
    name: "build-rest-api",
    command: "build",
    args: ["a", "REST", "API", "for", "user", "authentication"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      passthrough: false,
      department: "engineering",
      model: /claude-code/,
      has_spec: true,
      has_methodology: true,
      complexity: /medium|high/,
    },
  },
  {
    name: "build-high-complexity-oauth",
    command: "build",
    args: ["OAuth2", "multi-tenant", "production", "system"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "engineering",
      complexity: "high",
      has_spec: true,
      has_sub_agents: true,
      requires_checkpoint: true,
    },
  },
  {
    name: "review-single-file",
    command: "review",
    args: ["src/orchestrator/index.js"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "engineering",
      model: /claude-code/,
      has_spec: true,
      format: "structured_review",
      has_review_standard: true,
    },
  },
  {
    name: "review-staged-changes",
    command: "review",
    args: [],
    flags: ["--dry-run", "--staged"],
    expect: {
      tier: 2,
      department: "engineering",
    },
  },
  {
    name: "debug-with-file-context",
    command: "debug",
    args: ["segfault", "in", "worker", "thread"],
    flags: ["--dry-run", "--file", "src/agents/runner.js"],
    expect: {
      tier: 2,
      department: "engineering",
      complexity: /medium|high/,
      context_needed: ["src/agents/runner.js"],
    },
  },
  {
    name: "debug-simple",
    command: "debug",
    args: ["why", "is", "this", "function", "returning", "null"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "engineering",
    },
  },
  {
    name: "refactor-extract-helpers",
    command: "refactor",
    args: ["src/orchestrator/index.js"],
    flags: ["--dry-run", "--goal", "extract helper functions"],
    expect: {
      tier: 2,
      department: "engineering",
      complexity: "high",
      has_sub_agents: true,
      sub_agents_count: 5,
      requires_checkpoint: true,
      has_pipeline_steps: true,
    },
  },
  {
    name: "refactor-architecture-migration",
    command: "refactor",
    args: ["src/utils/"],
    flags: ["--dry-run", "--goal", "multi-file architecture migration"],
    expect: {
      tier: 2,
      complexity: "high",
      requires_checkpoint: true,
      sub_agents_count: 5,
    },
  },
];

// ─── Tier 2: Research ───────────────────────────────────────────

export const RESEARCH_PROMPTS = [
  {
    name: "research-k8s-vs-nomad",
    command: "research",
    args: ["Kubernetes", "vs", "Nomad", "for", "small", "teams"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "research",
      model: /gemini-2\.0-pro/,
      format: "research_report",
      has_spec: true,
    },
  },
  {
    name: "research-deep-topic",
    command: "research",
    args: ["state", "of", "WebAssembly", "for", "server-side", "computing"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "research",
      model: /gemini-2\.0-pro/,
    },
  },
  {
    name: "compare-databases",
    command: "compare",
    args: ["PostgreSQL", "SQLite"],
    flags: ["--dry-run", "--for", "embedded analytics"],
    expect: {
      tier: 2,
      department: "research",
      complexity: "high",
      model: /gemini-2\.0-pro/,
    },
  },
  {
    name: "summarize-local-file",
    command: "summarize",
    args: ["README.md"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "research",
      model: /gemini-2\.0-flash/,
    },
  },
  {
    name: "summarize-url",
    command: "summarize",
    args: ["https://example.com/article"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "research",
    },
  },
];

// ─── Tier 2: Infrastructure ─────────────────────────────────────

export const INFRASTRUCTURE_PROMPTS = [
  {
    name: "deploy-staging",
    command: "deploy",
    args: [],
    flags: ["--dry-run", "--env", "staging"],
    expect: {
      tier: 2,
      department: "infrastructure",
      model: /claude-code/,
      requires_checkpoint: true,
    },
  },
  {
    name: "deploy-production",
    command: "deploy",
    args: [],
    flags: ["--dry-run", "--env", "production"],
    expect: {
      tier: 2,
      department: "infrastructure",
      complexity: "high",
    },
  },
  {
    name: "diagnose-network",
    command: "diagnose",
    args: ["network", "latency", "on", "VLAN", "30"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "infrastructure",
      model: /claude-code/,
    },
  },
  {
    name: "diagnose-kubernetes",
    command: "diagnose",
    args: ["kubernetes", "pod", "CrashLoopBackOff"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "infrastructure",
      complexity: "high",
    },
  },
  {
    name: "provision-docker-stack",
    command: "provision",
    args: ["Docker", "Compose", "stack", "for", "monitoring"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "infrastructure",
    },
  },
];

// ─── Tier Upgrade: ask --deep ───────────────────────────────────

export const TIER_UPGRADE_PROMPTS = [
  {
    name: "ask-deep-upgrade",
    command: "ask",
    args: ["explain", "the", "CAP", "theorem"],
    flags: ["--dry-run", "--deep"],
    expect: {
      tier: 2,
      passthrough: false,
      has_spec: true,
    },
  },
  {
    name: "ask-deep-with-backend-override",
    command: "ask",
    args: ["explain", "event", "sourcing"],
    flags: ["--dry-run", "--deep", "--backend", "gemini"],
    expect: {
      tier: 2,
      passthrough: false,
      backend: "gemini",
    },
  },
];

// ─── Backend Override ───────────────────────────────────────────

export const BACKEND_OVERRIDE_PROMPTS = [
  {
    name: "ask-force-claude",
    command: "ask",
    args: ["hello", "world"],
    flags: ["--dry-run", "--backend", "claude"],
    expect: {
      tier: 1,
      backend: "claude",
    },
  },
  {
    name: "ask-force-gemini",
    command: "ask",
    args: ["hello"],
    flags: ["--dry-run", "--backend", "gemini"],
    expect: {
      tier: 1,
      backend: "gemini",
    },
  },
  {
    name: "build-force-ollama",
    command: "build",
    args: ["a", "hello", "world", "script"],
    flags: ["--dry-run", "--backend", "ollama"],
    expect: {
      tier: 2,
      backend: "ollama",
    },
  },
  {
    name: "research-force-model",
    command: "research",
    args: ["best", "practices", "for", "caching"],
    flags: ["--dry-run", "--model", "gemini-2.0-flash"],
    expect: {
      tier: 2,
      model: /gemini-2\.0-flash/,
    },
  },
];

// ─── Sub-Agent & Pipeline Verification ──────────────────────────

export const SUB_AGENT_PROMPTS = [
  {
    name: "refactor-generates-five-sub-agents",
    command: "refactor",
    args: ["src/brain/index.js"],
    flags: ["--dry-run", "--goal", "modularize query logic"],
    expect: {
      has_sub_agents: true,
      sub_agents_count: 5,
      sub_agent_names: [
        "Research current approach",
        "Analyze current code paths",
        "Generate refactor plan",
        "Generate tests",
        "Security review",
      ],
    },
  },
  {
    name: "high-build-generates-pipeline",
    command: "build",
    args: ["production", "multi-file", "authentication", "system"],
    flags: ["--dry-run"],
    expect: {
      complexity: "high",
      has_pipeline_steps: true,
      pipeline_step_names: [
        "Plan implementation",
        "Checkpoint: review plan",
        "Execute build",
        "Generate tests",
        "Review",
      ],
    },
  },
  {
    name: "simple-build-no-pipeline",
    command: "build",
    args: ["a", "utility", "function"],
    flags: ["--dry-run"],
    expect: {
      complexity: /low|medium/,
      no_pipeline_steps: true,
    },
  },
];

// ─── Brain Operations ───────────────────────────────────────────

export const BRAIN_PROMPTS = [
  {
    name: "brain-init",
    command: "brain",
    args: ["init"],
    flags: [],
    expect: {
      output_contains: ["provider: local", "notebooks"],
    },
  },
  {
    name: "brain-list",
    command: "brain",
    args: ["list"],
    flags: [],
    expect: {
      output_contains: ["models", "project-blacksmith", "history-engineering"],
    },
  },
  {
    name: "brain-health",
    command: "brain",
    args: ["health"],
    flags: [],
    expect: {
      output_contains: ["notebooks:", "total_bytes:"],
    },
  },
  {
    name: "brain-refresh",
    command: "brain",
    args: ["refresh"],
    flags: [],
    expect: {
      output_contains: ["last_refreshed:"],
    },
  },
  {
    name: "brain-ask-specific-notebook",
    command: "brain",
    args: ["ask", "models", "what", "is", "the", "cheapest", "model"],
    flags: [],
    expect: {
      output_contains: ["notebook: models", "query:"],
    },
  },
  {
    name: "brain-auto-route-query",
    command: "brain",
    args: ["what", "errors", "have", "we", "seen"],
    flags: [],
    expect: {
      output_contains: ["notebooks"],
    },
  },
];

// ─── Identity Operations ────────────────────────────────────────

export const IDENTITY_PROMPTS = [
  {
    name: "identity-summary",
    command: "identity",
    args: [],
    flags: [],
    expect: {
      output_contains: ["mission:", "departments:"],
    },
  },
  {
    name: "identity-departments",
    command: "identity",
    args: [],
    flags: ["--departments"],
    expect: {
      output_contains: ["engineering:", "research:", "infrastructure:", "operations:"],
    },
  },
  {
    name: "identity-owner",
    command: "identity",
    args: [],
    flags: ["--owner"],
    expect: {
      output_contains: ["name: Jake"],
    },
  },
  {
    name: "identity-single-department",
    command: "identity",
    args: [],
    flags: ["--department", "engineering"],
    expect: {
      output_contains: ["focus:", "methodology:"],
    },
  },
  {
    name: "identity-profile-list",
    command: "identity",
    args: ["profile", "list"],
    flags: [],
    expect: {
      output_contains: ["coding.md", "campaign.md", "grants.md"],
    },
  },
  {
    name: "identity-profile-apply-coding",
    command: "identity",
    args: ["profile", "apply", "coding"],
    flags: ["--force"],
    expect: {
      file_check: {
        path: "Intent.md",
        contains: "Coding Profile",
      },
    },
  },
  {
    name: "identity-profile-apply-campaign",
    command: "identity",
    args: ["profile", "apply", "campaign"],
    flags: ["--force"],
    expect: {
      file_check: {
        path: "Intent.md",
        contains: "Campaign Profile",
      },
    },
  },
];

// ─── MCR Operations ─────────────────────────────────────────────

export const MCR_PROMPTS = [
  {
    name: "mcr-show-all",
    command: "mcr",
    args: ["show"],
    flags: [],
    expect: {
      output_contains: ["claude-code:", "gemini-2.0-pro:", "ollama-qwen2.5-coder:"],
    },
  },
  {
    name: "mcr-show-single-model",
    command: "mcr",
    args: ["show"],
    flags: ["--model", "claude-code"],
    expect: {
      output_contains: ["provider: anthropic", "strengths:"],
    },
  },
  {
    name: "mcr-compare",
    command: "mcr",
    args: ["compare", "claude-code", "gemini-2.0-pro"],
    flags: ["--for", "code review"],
    expect: {
      output_contains: ["winner:", "left:", "right:", "score:"],
    },
  },
  {
    name: "mcr-update",
    command: "mcr",
    args: ["update"],
    flags: [],
    expect: {
      output_contains: ["Semi-automated update completed"],
    },
  },
  {
    name: "mcr-edit",
    command: "mcr",
    args: ["edit"],
    flags: [],
    expect: {
      output_contains: ["mcr.yaml"],
    },
  },
];

// ─── System Commands ────────────────────────────────────────────

export const SYSTEM_PROMPTS = [
  {
    name: "config-show",
    command: "config",
    args: ["show"],
    flags: [],
    expect: {
      output_contains: ["backends:", "routing:", "ledger:"],
    },
  },
  {
    name: "config-set-value",
    command: "config",
    args: ["set", "routing.cost_hard_stop", "5.0"],
    flags: [],
    expect: {
      output_contains: ["cost_hard_stop: 5"],
    },
  },
  {
    name: "spend-summary",
    command: "spend",
    args: [],
    flags: [],
    expect: {
      output_contains: ["total_cost:", "calls:"],
    },
  },
  {
    name: "spend-dashboard",
    command: "spend",
    args: [],
    flags: ["--dashboard"],
    expect: {
      file_check: {
        path: "reports/spend-dashboard.html",
        contains: "Blacksmith Spend Dashboard",
      },
    },
  },
  {
    name: "routing-report",
    command: "routing-report",
    args: [],
    flags: [],
    expect: {
      output_contains: ["routing-performance.md"],
      file_check: {
        path: "reports/routing-performance.md",
        contains: "Routing Performance Summary",
      },
    },
  },
];

// ─── Map Command ────────────────────────────────────────────────

export const MAP_PROMPTS = [
  {
    name: "map-writes-tree",
    command: "map",
    args: [],
    flags: [],
    expect: {
      custom: "map_verification",
    },
  },
];

// ─── Edge Cases ─────────────────────────────────────────────────

export const EDGE_CASE_PROMPTS = [
  {
    name: "ask-empty-task",
    command: "ask",
    args: [""],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
    },
  },
  {
    name: "ask-very-long-prompt",
    command: "ask",
    args: [Array(200).fill("word").join(" ")],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
    },
  },
  {
    name: "broken-intent-tier1-still-works",
    command: "ask",
    args: ["hello"],
    flags: ["--dry-run"],
    expect: {
      tier: 1,
      passthrough: true,
      custom: "broken_intent",
    },
  },
  {
    name: "review-nonexistent-file",
    command: "review",
    args: ["nonexistent-file.js"],
    flags: ["--dry-run"],
    expect: {
      tier: 2,
      department: "engineering",
    },
  },
];

// ─── Classification Accuracy ────────────────────────────────────

export const CLASSIFICATION_PROMPTS = [
  {
    name: "classify-high-complexity-deploy",
    command: "deploy",
    args: [],
    flags: ["--dry-run", "--env", "production"],
    expect: { complexity: "high", department: "infrastructure" },
  },
  {
    name: "classify-medium-complexity-debug",
    command: "debug",
    args: ["fix", "the", "error", "in", "api", "endpoint"],
    flags: ["--dry-run"],
    expect: { complexity: "medium", department: "engineering" },
  },
  {
    name: "classify-research-department",
    command: "research",
    args: ["compare", "react", "and", "vue"],
    flags: ["--dry-run"],
    expect: { department: "research" },
  },
  {
    name: "classify-operations-commit",
    command: "commit",
    args: [],
    flags: ["--dry-run"],
    expect: { department: "operations" },
  },
  {
    name: "classify-infra-keywords",
    command: "ask",
    args: ["how", "to", "deploy", "terraform", "on", "kubernetes"],
    flags: ["--dry-run", "--deep"],
    expect: { department: "infrastructure" },
  },
];

// ─── All Suites ─────────────────────────────────────────────────

export const ALL_SUITES = {
  tier1_passthrough: TIER1_PROMPTS,
  engineering: ENGINEERING_PROMPTS,
  research: RESEARCH_PROMPTS,
  infrastructure: INFRASTRUCTURE_PROMPTS,
  tier_upgrade: TIER_UPGRADE_PROMPTS,
  backend_override: BACKEND_OVERRIDE_PROMPTS,
  sub_agents: SUB_AGENT_PROMPTS,
  brain: BRAIN_PROMPTS,
  identity: IDENTITY_PROMPTS,
  mcr: MCR_PROMPTS,
  system: SYSTEM_PROMPTS,
  map: MAP_PROMPTS,
  edge_cases: EDGE_CASE_PROMPTS,
  classification: CLASSIFICATION_PROMPTS,
};

export const PROMPT_COUNT = Object.values(ALL_SUITES).reduce((sum, suite) => sum + suite.length, 0);
