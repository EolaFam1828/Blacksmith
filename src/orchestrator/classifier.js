const COMPLEXITY_KEYWORDS = {
  high: [
    "multi-file",
    "architecture",
    "migration",
    "production",
    "deploy",
    "oauth",
    "system",
    "compare",
    "research",
    "kubernetes",
    "infrastructure"
  ],
  medium: ["build", "debug", "review", "refactor", "endpoint", "api", "feature", "error"]
};

const detectDepartment = (lower, command) => {
  if (["research", "compare", "summarize"].includes(command)) {
    return "research";
  }

  if (["deploy", "diagnose", "provision"].includes(command)) {
    return "infrastructure";
  }

  if (command === "commit") {
    return "operations";
  }

  if (/(deploy|infrastructure|terraform|network|kubernetes|docker|vlan|homelab)/.test(lower)) {
    return "infrastructure";
  }

  if (/(research|compare|summarize|analysis|benchmark)/.test(lower)) {
    return "research";
  }

  if (/(commit|pr|merge|ci|release)/.test(lower)) {
    return "operations";
  }

  return "engineering";
};

const detectTier = ({ command, deep = false }) => {
  if (command === "commit") {
    return { tier: 1, passthrough: true, reason: "deterministic commit-message workflow" };
  }

  if (command === "ask" && !deep) {
    return { tier: 1, passthrough: true, reason: "raw passthrough ask command" };
  }

  return { tier: 2, passthrough: false, reason: "requires orchestrated agent assembly" };
};

export const classifyTask = ({ command, prompt, filePaths = [], deep = false }) => {
  const lower = `${command} ${prompt}`.toLowerCase();
  const hasFiles = filePaths.length > 0;

  let complexity = "low";
  if (COMPLEXITY_KEYWORDS.high.some((term) => lower.includes(term))) {
    complexity = "high";
  } else if (COMPLEXITY_KEYWORDS.medium.some((term) => lower.includes(term)) || hasFiles) {
    complexity = "medium";
  }

  if ((command === "review" || command === "debug") && hasFiles) {
    complexity = complexity === "low" ? "medium" : complexity;
  }

  if (["refactor", "research", "compare"].includes(command)) {
    complexity = "high";
  }

  const taskTypeMap = {
    ask: "raw_query",
    build: "implementation",
    review: "code_review",
    debug: "debugging",
    research: "research",
    compare: "comparison",
    summarize: "summarization",
    refactor: "refactor",
    commit: "commit_message",
    deploy: "deployment",
    diagnose: "diagnosis",
    provision: "provisioning"
  };

  const tiering = detectTier({ command, deep });
  const subAgentsNeeded =
    command === "refactor"
      ? 5
      : command === "build" && complexity === "high"
        ? 2
        : 0;

  const requiresCheckpoint =
    ["deploy", "provision"].includes(command) ||
    (["refactor", "build"].includes(command) && complexity === "high");

  let learnedPattern = null;
  if (_learnedPatterns) {
    const key = `${command}:${complexity}`;
    learnedPattern = _learnedPatterns[key] || null;
  }

  return {
    task_type: taskTypeMap[command] || command,
    complexity,
    department: detectDepartment(lower, command),
    context_needed: hasFiles ? filePaths : [],
    estimated_context_tokens: hasFiles ? filePaths.length * 1500 : 400,
    sub_agents_needed: subAgentsNeeded,
    requires_checkpoint: requiresCheckpoint,
    tier: learnedPattern?.tier ?? tiering.tier,
    passthrough: learnedPattern?.passthrough ?? tiering.passthrough,
    route_reason: learnedPattern?.reason ?? tiering.reason
  };
};

let _learnedPatterns = null;

export const loadLearnedPatterns = async () => {
  try {
    const { readFile } = await import("node:fs/promises");
    const { getBlacksmithPath } = await import("../utils/paths.js");
    const data = await readFile(getBlacksmithPath("learned-patterns.json"), "utf8");
    _learnedPatterns = JSON.parse(data);
  } catch {
    _learnedPatterns = null;
  }
};
