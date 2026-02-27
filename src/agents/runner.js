import { runBackend } from "../backends/index.js";

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
