import { loadMcr } from "../utils/config.js";

const scoreModel = (model, taskType, complexity, contextSize) => {
  let score = 50;

  if (model.use_cases?.includes(taskType)) score += 20;

  const pricing = model.pricing || {};
  const costPerCall = (pricing.input_per_1m || 0) * 0.001 + (pricing.output_per_1m || 0) * 0.001;
  if (costPerCall === 0) score += 15;
  else if (costPerCall < 1) score += 10;
  else if (costPerCall < 5) score += 5;

  const ctx = model.context_window || 0;
  if (contextSize && ctx >= contextSize) score += 10;
  else if (contextSize && ctx < contextSize) score -= 20;

  if (model.speed === "fast") score += 10;
  else if (model.speed === "slow") score -= 5;

  if (complexity === "high" && model.strengths?.includes("complex reasoning")) score += 15;
  if (complexity === "low" && model.speed === "fast") score += 10;

  return Math.max(0, Math.min(100, score));
};

export const deepCompare = async (modelIds, useCase) => {
  const mcr = await loadMcr();
  const rows = [];

  for (const id of modelIds) {
    const model = mcr.models?.[id];
    if (!model) continue;

    rows.push({
      id,
      backend: model.backend || "unknown",
      context_window: model.context_window || 0,
      input_price: model.pricing?.input_per_1m || 0,
      output_price: model.pricing?.output_per_1m || 0,
      speed: model.speed || "unknown",
      strengths: model.strengths || [],
      use_cases: model.use_cases || [],
      relevance: (model.use_cases || []).includes(useCase) ? "high" : "low"
    });
  }

  return {
    use_case: useCase,
    models: rows,
    recommendation: rows.length > 0
      ? rows.sort((a, b) => (a.relevance === "high" ? -1 : 1))[0].id
      : null
  };
};

export const rankModelsForTask = async (taskType, complexity, contextSize) => {
  const mcr = await loadMcr();
  const models = Object.entries(mcr.models || {});

  const ranked = models.map(([id, model]) => ({
    id,
    score: scoreModel(model, taskType, complexity, contextSize),
    cost: (model.pricing?.input_per_1m || 0) + (model.pricing?.output_per_1m || 0),
    context_window: model.context_window || 0
  }));

  ranked.sort((a, b) => b.score - a.score);

  return ranked;
};
