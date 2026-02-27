import { getModelEntry, resolveModelId } from "../mcr/index.js";

export const estimateExpectedCompletionTokens = (classification) => {
  if (!classification) {
    return 200;
  }

  if (classification.task_type === "commit_message") {
    return 80;
  }

  if (classification.task_type === "raw_query") {
    return 120;
  }

  if (classification.complexity === "high") {
    return 3000;
  }

  if (classification.complexity === "medium") {
    return 1000;
  }

  return 200;
};

export const estimateCost = async (modelId, prompt, classification, expectedOutput) => {
  const resolved = resolveModelId(modelId);
  const model = await getModelEntry(resolved);
  const completionTokens = expectedOutput ?? estimateExpectedCompletionTokens(classification);
  if (!model?.cost) {
    return {
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: completionTokens,
      estimated_cost: 0
    };
  }

  const promptTokens = estimateTokens(prompt);
  const input = (model.cost.input_per_1m || 0) * (promptTokens / 1_000_000);
  const output = (model.cost.output_per_1m || 0) * (completionTokens / 1_000_000);
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    estimated_cost: Number((input + output).toFixed(6))
  };
};

const estimateTokens = (value) => Math.ceil((value || "").length / 4);
