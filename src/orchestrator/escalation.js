import { runPrimaryAgent } from "../agents/runner.js";
import { backendForModel, resolveModelId } from "../mcr/index.js";

const ESCALATION_CHAIN = {
  "ollama-qwen2.5-coder": "gemini-2.0-flash",
  "ollama-deepseek-r1": "o3-mini",
  "ollama-llama-3.3-70b": "gemini-2.0-pro",
  "gemini-2.0-flash": "gemini-2.0-pro",
  "gpt-4o-mini": "gpt-4.5",
  "o3-mini": "o3",
  "claude-3.5-haiku": "claude-code",
  "codex-cli": "claude-code",
  "gemini-2.0-pro": "claude-code",
  "gpt-4.5": "claude-code",
  "o3": "claude-code"
};

const MIN_LENGTH_THRESHOLDS = {
  high: 600,
  medium: 200,
  low: 50
};

export const shouldEscalate = (result, classification, { autoEscalate = true, explicitBackend } = {}) => {
  if (!autoEscalate || explicitBackend) return false;

  const text = result.text?.trim() || "";

  if (text.length === 0) return true;

  if (/^(error|failed|sorry|i can't|unable to)/i.test(text)) return true;

  const threshold = MIN_LENGTH_THRESHOLDS[classification.complexity] || 50;
  if (text.length < threshold) return true;

  return false;
};

export const getEscalationTarget = (currentModel) => {
  const resolved = resolveModelId(currentModel);
  return ESCALATION_CHAIN[resolved] || null;
};

export const escalate = async (task, currentResult, classification, config) => {
  const currentModel = currentResult.model || classification.model;
  const nextModel = getEscalationTarget(currentModel);

  if (!nextModel) {
    return { escalated: false, result: currentResult, model: currentModel };
  }

  const nextBackend = backendForModel(nextModel);
  const prompt = `${task}\n\nPrevious attempt was insufficient. Return a stronger answer.`;

  const escalatedResult = await runPrimaryAgent({
    backend: nextBackend,
    model: nextModel,
    prompt,
    options: {
      cwd: config?.cwd || process.cwd(),
      modelName: nextModel
    }
  });

  return {
    escalated: true,
    result: {
      ...escalatedResult,
      text: `${escalatedResult.text}\n\n[Escalated from ${currentModel} to ${nextModel}]`
    },
    model: nextModel,
    backend: nextBackend,
    previousModel: currentModel
  };
};
