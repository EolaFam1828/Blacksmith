import { backendForModel } from "../mcr/index.js";
import { runClaudePrompt, runCodexPrompt, runGeminiPrompt, runJulesPrompt } from "./cli.js";
import { runGithubOperation } from "./github.js";
import { runOllamaPrompt } from "./ollama.js";

export const runBackend = async ({ backend, model, prompt, options = {} }) => {
  const effectiveBackend = backend || backendForModel(model);
  if (!effectiveBackend) {
    throw new Error(`Unsupported backend for model '${model}'.`);
  }

  switch (effectiveBackend) {
    case "ollama":
      return runOllamaPrompt(prompt, { ...options, model: options.modelName || model });
    case "claude":
      return runClaudePrompt(prompt, { ...options, model: options.modelName || options.model });
    case "gemini":
      return runGeminiPrompt(prompt, { ...options, model: options.modelName || options.model });
    case "codex":
      return runCodexPrompt(prompt, { ...options, model: options.modelName || options.model });
    case "jules":
      return runJulesPrompt(prompt, options);
    case "github":
      return runGithubOperation(prompt, options);
    default:
      throw new Error(`Backend '${effectiveBackend}' is not implemented.`);
  }
};
