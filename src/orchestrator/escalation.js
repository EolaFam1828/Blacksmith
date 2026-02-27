import { runPrimaryAgent } from "../agents/runner.js";
import { runBackend } from "../backends/index.js";
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

const JUDGE_PROMPT_TEMPLATE = `You are a response quality judge. Evaluate whether this AI response adequately answers the task.

Task: {task}
Complexity: {complexity}
Response: {response}

Reply with exactly three lines in this format:
VERDICT: ADEQUATE|INADEQUATE|UNCERTAIN
REASON: <one sentence>
CONFIDENCE: <0.0-1.0>`;

export const parseJudgeVerdict = (text) => {
  if (!text || typeof text !== "string") {
    return { shouldEscalate: false, reason: "parse failure", confidence: 0 };
  }

  const verdictMatch = text.match(/VERDICT:\s*(ADEQUATE|INADEQUATE|UNCERTAIN)/i);
  const reasonMatch = text.match(/REASON:\s*(.+)/i);
  const confidenceMatch = text.match(/CONFIDENCE:\s*([\d.]+)/i);

  if (!verdictMatch) {
    return { shouldEscalate: false, reason: "parse failure", confidence: 0 };
  }

  const verdict = verdictMatch[1].toUpperCase();
  const reason = reasonMatch ? reasonMatch[1].trim() : "no reason given";
  const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
  const clampedConfidence = Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0.5));

  return {
    shouldEscalate: verdict === "INADEQUATE",
    reason,
    confidence: clampedConfidence
  };
};

export const judgeResponse = async (task, result, classification) => {
  const prompt = JUDGE_PROMPT_TEMPLATE
    .replace("{task}", task)
    .replace("{complexity}", classification.complexity || "unknown")
    .replace("{response}", (result.text || "").slice(0, 2000));

  try {
    const judgeResult = await runBackend({
      backend: "gemini",
      model: "gemini-2.0-flash",
      prompt,
      options: { modelName: "gemini-2.0-flash" }
    });
    return parseJudgeVerdict(judgeResult.text);
  } catch {
    return { shouldEscalate: false, reason: "judge unavailable", confidence: 0 };
  }
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
