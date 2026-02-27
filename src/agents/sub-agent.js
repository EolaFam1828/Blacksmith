import { executeAgentSpec } from "./runner.js";
import { backendForModel, resolveModelId } from "../mcr/index.js";
import { confirmAction } from "../utils/prompt.js";

const makeSubAgent = (name, department, model, prompt, kind, opts = {}) => ({
  name,
  department,
  model,
  prompt,
  kind,
  destructive: opts.destructive || false,
  checkpoint: opts.checkpoint || false
});

export const planSubAgents = ({ classification, task }) => {
  if (classification.task_type === "refactor") {
    return [
      makeSubAgent("Research current approach", "research", "gemini-2.5-pro", `Research best practices for: ${task}`, "research"),
      makeSubAgent("Analyze current code paths", "engineering", "ollama-deepseek-r1", `Analyze current code paths for: ${task}`, "analysis"),
      makeSubAgent("Generate refactor plan", "engineering", "claude-code", `Generate a step-by-step refactor plan for: ${task}`, "plan", { checkpoint: true }),
      makeSubAgent("Generate tests", "engineering", "ollama-qwen2.5-coder", `Generate tests for: ${task}`, "tests"),
      makeSubAgent("Security review", "engineering", "gemini-2.5-pro", `Review the refactor plan for security risks: ${task}`, "review")
    ];
  }

  if (classification.task_type === "implementation" && classification.complexity === "high") {
    return [
      makeSubAgent("Plan implementation", "engineering", "claude-code", `Create an implementation plan for: ${task}`, "plan", { checkpoint: true }),
      makeSubAgent("Generate tests", "engineering", "ollama-qwen2.5-coder", `Draft a test plan for: ${task}`, "tests")
    ];
  }

  return [];
};

export const summarizeSubAgentResults = (results) =>
  results.map((result) => `### ${result.name}\n- Model: ${result.model}\n- Outcome: ${result.text.slice(0, 400)}`).join("\n\n");

export const shouldRequestCheckpoint = (step) =>
  step.checkpoint === true || step.destructive === true;

const compressStepOutput = (text, maxLen = 2000) => {
  if (text.length <= maxLen) return text;
  const head = text.slice(0, maxLen * 0.6);
  const tail = text.slice(-maxLen * 0.3);
  return `${head}\n\n[... compressed ${text.length - maxLen} chars ...]\n\n${tail}`;
};

export const runSubAgentPipeline = async (session, steps, config) => {
  const results = [];
  let priorContext = "";

  for (const step of steps) {
    if (shouldRequestCheckpoint(step)) {
      const proceed = await confirmAction(`Checkpoint: proceed with "${step.name}"?`);
      if (!proceed) {
        results.push({
          name: step.name,
          kind: step.kind,
          model: step.model,
          text: "Skipped by user at checkpoint.",
          usage: { prompt_tokens: 0, completion_tokens: 0 },
          skipped: true
        });
        continue;
      }
    }

    const resolvedModel = resolveModelId(step.model);
    const backend = backendForModel(resolvedModel);
    const prompt = priorContext
      ? `${step.prompt}\n\nPrior context from earlier steps:\n${priorContext}`
      : step.prompt;

    const spec = {
      runtime: { backend, model: resolvedModel },
      context: { cwd: session?.metadata?.cwd || process.cwd() }
    };

    const result = await executeAgentSpec(spec, prompt, {
      backend,
      model: resolvedModel,
      modelName: resolvedModel,
      timeout: config?.routing?.timeout_ms || 90_000,
      costGuard: config?.routing?.cost_hard_stop || 2,
      showSpinner: true
    });

    results.push({
      name: step.name,
      kind: step.kind,
      model: resolvedModel,
      text: result.text,
      usage: result.usage,
      success: result.success,
      duration_ms: result.duration_ms
    });

    priorContext = compressStepOutput(
      results.map((r) => `### ${r.name}\n${r.text}`).join("\n\n")
    );
  }

  return results;
};
