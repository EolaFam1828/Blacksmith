import { runBackend } from "../backends/index.js";
import { withSpinner } from "../utils/spinner.js";

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_COST_GUARD = 2;

export const executeAgentSpec = async (spec, prompt, options = {}) => {
  const { timeout = DEFAULT_TIMEOUT_MS, costGuard = DEFAULT_COST_GUARD, showSpinner = true } = options;
  const backend = spec.runtime?.backend || options.backend;
  const model = spec.runtime?.model || options.model;
  const label = `Running ${model}`;

  const start = Date.now();
  let result;

  const execute = () =>
    Promise.race([
      runBackend({
        backend,
        model,
        prompt,
        options: {
          cwd: spec.context?.cwd || options.cwd,
          modelName: options.modelName || model
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Agent timed out after ${timeout}ms`)), timeout)
      )
    ]);

  try {
    result = showSpinner ? await withSpinner(label, execute) : await execute();
  } catch (error) {
    return {
      text: `Agent failed: ${error.message}`,
      usage: { prompt_tokens: 0, completion_tokens: 0 },
      model,
      duration_ms: Date.now() - start,
      success: false
    };
  }

  return {
    text: result.text,
    usage: result.usage,
    model,
    duration_ms: Date.now() - start,
    success: true
  };
};

export const runPrimaryAgent = async ({ backend, model, prompt, options }) =>
  runBackend({ backend, model, prompt, options });

export const runSubAgent = async ({ backend, model, prompt, options, name, kind }) => {
  const result = await runBackend({ backend, model, prompt, options });
  return {
    name,
    kind,
    model,
    text: result.text,
    usage: result.usage
  };
};
