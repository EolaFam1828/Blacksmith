import { loadMcr } from "../utils/config.js";

const BACKEND_ALIASES = {
  claude: "claude-code",
  claude_code: "claude-code",
  "claude code": "claude-code",
  gemini: "gemini-2.5-pro",
  gemini_pro: "gemini-2.5-pro",
  "gemini pro": "gemini-2.5-pro",
  gemini_flash: "gemini-2.5-flash",
  "gemini flash": "gemini-2.5-flash",
  ollama: "ollama-qwen2.5-coder",
  ollama_reasoning: "ollama-deepseek-r1",
  "github cli": "github-cli",
  codex: "codex-cli",
  jules: "jules-cli"
};

export const getMcr = async () => loadMcr();

export const getModelEntry = async (modelId) => {
  const mcr = await getMcr();
  return mcr.models?.[modelId] || null;
};

export const resolveModelId = (name) => {
  if (!name) {
    return name;
  }

  const normalized = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return BACKEND_ALIASES[name] || BACKEND_ALIASES[normalized] || name;
};

export const backendForModel = (modelId) => {
  if (modelId.startsWith("ollama-")) {
    return "ollama";
  }

  if (modelId.startsWith("claude")) {
    return "claude";
  }

  if (modelId.startsWith("gemini")) {
    return "gemini";
  }

  if (modelId.startsWith("codex")) {
    return "codex";
  }

  if (modelId.startsWith("jules")) {
    return "jules";
  }

  if (modelId.startsWith("github")) {
    return "github";
  }

  return null;
};

export const compareModels = async (left, right, useCase) => {
  const mcr = await getMcr();
  const leftEntry = mcr.models?.[resolveModelId(left)];
  const rightEntry = mcr.models?.[resolveModelId(right)];

  if (!leftEntry || !rightEntry) {
    throw new Error("Both models must exist in the registry.");
  }

  const score = (entry) => {
    let total = 0;

    if (entry.speed === "fastest") total += 3;
    if (entry.speed === "fast") total += 2;
    if (entry.speed === "medium") total += 1;
    if ((entry.cost?.input_per_1m ?? 999) <= 0.2) total += 3;
    else if ((entry.cost?.input_per_1m ?? 999) <= 1.5) total += 2;
    else total += 1;

    if (useCase) {
      const bestFor = entry.best_for || [];
      total += bestFor.some((value) =>
        value.toLowerCase().includes(useCase.toLowerCase())
      )
        ? 3
        : 0;
    }

    return total;
  };

  const leftScore = score(leftEntry);
  const rightScore = score(rightEntry);
  const winner = leftScore === rightScore ? "tie" : leftScore > rightScore ? left : right;

  return {
    winner,
    left: { id: resolveModelId(left), ...leftEntry, score: leftScore },
    right: { id: resolveModelId(right), ...rightEntry, score: rightScore },
    useCase: useCase || null
  };
};
