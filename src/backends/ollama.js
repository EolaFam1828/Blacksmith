import { loadConfig } from "../utils/config.js";

export const runOllamaPrompt = async (prompt, options = {}) => {
  const config = await loadConfig();
  const model = options.model || config.backends?.ollama?.default_model;
  const host = config.backends?.ollama?.host || "http://localhost:11434";
  const tagsUrl = new URL("/api/tags", host);
  const tagsResponse = await fetch(tagsUrl);
  if (tagsResponse.ok) {
    const tags = await tagsResponse.json();
    const installed = (tags.models || []).map((entry) => entry.name);
    if (installed.length === 0) {
      throw new Error(
        "Ollama is reachable but no models are installed. Pull one first, for example `ollama pull qwen2.5-coder:7b`."
      );
    }

    if (!installed.includes(model)) {
      throw new Error(
        `Ollama model '${model}' is not installed. Available models: ${installed.join(", ")}`
      );
    }
  }

  const url = new URL("/api/generate", host);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  return {
    text: data.response?.trim() || "",
    model,
    raw: data,
    usage: {
      prompt_tokens: data.prompt_eval_count || estimateTokens(prompt),
      completion_tokens: data.eval_count || estimateTokens(data.response || "")
    }
  };
};

const estimateTokens = (value) => Math.ceil((value || "").length / 4);
