import { commandExists } from "./command.js";

export const probeOllama = async (config) => {
  const host = config?.backends?.ollama?.host || "http://localhost:11434";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${host}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);
    return { name: "ollama", available: true, detail: `${models.length} model(s) loaded`, models };
  } catch {
    return { name: "ollama", available: false, detail: "Not running or unreachable", models: [] };
  }
};

export const probeCli = async (name, command, installHint) => {
  const found = await commandExists(command);
  return {
    name,
    available: found,
    detail: found ? `${command} found in PATH` : installHint,
  };
};

export const probeBackends = async (config) => {
  const results = await Promise.all([
    probeOllama(config),
    probeCli("claude", "claude", "Install: npm i -g @anthropic-ai/claude-code"),
    probeCli("gemini", "gemini", "Install: npm i -g @anthropic-ai/claude-code (or set API key)"),
    probeCli("codex", "codex", "Install: npm i -g @openai/codex"),
    probeCli("github", "gh", "Install: https://cli.github.com"),
  ]);
  return results;
};

export const buildEnabledPatch = (results) => {
  const patch = {};
  for (const r of results) {
    patch[r.name] = { enabled: r.available };
  }
  return patch;
};
