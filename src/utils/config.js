import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { ensureBlacksmithHome } from "./bootstrap.js";
import { BLACKSMITH_HOME, resolveHomePath, toPortablePath } from "./paths.js";

const readYaml = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return YAML.parse(raw);
};

const writeYaml = async (filePath, value) => {
  await fs.writeFile(filePath, YAML.stringify(value), "utf8");
};

export const getConfigPath = () => path.join(BLACKSMITH_HOME, "config.yaml");
export const getMcrPath = () => path.join(BLACKSMITH_HOME, "mcr.yaml");
export const getBrainPath = () => path.join(BLACKSMITH_HOME, "brain.yaml");
export const getIntentPath = () => path.join(BLACKSMITH_HOME, "Intent.md");
export const getOrchestratorPromptPath = () =>
  path.join(BLACKSMITH_HOME, "OrchestratorPrompt.md");

export const loadConfig = async () => {
  await ensureBlacksmithHome();
  const config = await readYaml(getConfigPath());
  if (config?.ledger?.db_path) {
    config.ledger.db_path = resolveHomePath(config.ledger.db_path);
  }
  return config;
};

export const saveConfig = async (config) => writeYaml(getConfigPath(), config);

export const loadMcr = async () => {
  await ensureBlacksmithHome();
  return readYaml(getMcrPath());
};

export const saveMcr = async (mcr) => writeYaml(getMcrPath(), mcr);

export const loadBrainRegistry = async () => {
  await ensureBlacksmithHome();
  const registry = await readYaml(getBrainPath());
  registry.notebooks = registry.notebooks.map((entry) => ({
    ...entry,
    file: resolveHomePath(entry.file)
  }));
  return registry;
};

export const saveBrainRegistry = async (registry) => {
  const portable = {
    ...registry,
    notebooks: registry.notebooks.map((entry) => ({
      ...entry,
      file: toPortablePath(entry.file)
    }))
  };
  return writeYaml(getBrainPath(), portable);
};

export const loadIntent = async () => {
  await ensureBlacksmithHome();
  return fs.readFile(getIntentPath(), "utf8");
};

export const saveIntent = async (contents) => {
  await fs.writeFile(getIntentPath(), contents, "utf8");
};

export const loadOrchestratorPrompt = async () => {
  await ensureBlacksmithHome();
  return fs.readFile(getOrchestratorPromptPath(), "utf8");
};

export const setConfigValue = async (keyPath, rawValue) => {
  const config = await loadConfig();
  const segments = keyPath.split(".");
  let current = config;
  for (const segment of segments.slice(0, -1)) {
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  }

  let parsed = rawValue;
  if (rawValue === "true") {
    parsed = true;
  } else if (rawValue === "false") {
    parsed = false;
  } else if (!Number.isNaN(Number(rawValue)) && rawValue.trim() !== "") {
    parsed = Number(rawValue);
  }

  current[segments.at(-1)] = parsed;
  await saveConfig(config);
  return config;
};
