const ROUTES = [
  { notebook: "models", keywords: ["model", "pricing", "benchmark", "tokens", "cost"] },
  { notebook: "errors", keywords: ["error", "stack", "trace", "failure", "exception"] },
  {
    notebook: "project-blacksmith",
    keywords: ["blacksmith", "project", "cli", "orchestrator", "intent", "brain"]
  },
  {
    notebook: "history-engineering",
    keywords: ["build", "review", "debug", "refactor", "architecture", "code"]
  },
  {
    notebook: "history-research",
    keywords: ["research", "compare", "summary", "summarize", "tradeoff", "benchmark"]
  },
  {
    notebook: "history-infrastructure",
    keywords: ["deploy", "diagnose", "provision", "infra", "kubernetes", "docker", "network"]
  },
  {
    notebook: "history-operations",
    keywords: ["commit", "pr", "merge", "ci", "release"]
  },
  { notebook: "reference", keywords: ["reference", "docs", "doc", "guide", "example"] }
];

export const routeBrainQuery = (query) => {
  const lower = query.toLowerCase();
  const matches = ROUTES.filter((route) =>
    route.keywords.some((keyword) => lower.includes(keyword))
  ).map((route) => route.notebook);

  return matches.length > 0 ? [...new Set(matches)] : ["reference", "project-blacksmith"];
};
