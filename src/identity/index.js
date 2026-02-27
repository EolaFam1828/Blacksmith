import { resolveModelId } from "../mcr/index.js";
import { readParsedIntent } from "./intent-parser.js";

const normalizeModelName = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const HUMAN_MODEL_ALIASES = {
  "claude code": "claude-code",
  "ollama": "ollama-qwen2.5-coder",
  "gemini pro": "gemini-2.5-pro",
  "gemini flash": "gemini-2.5-flash",
  "codex": "codex-cli",
  "jules": "jules-cli"
};

const resolveHumanModel = (value) => {
  const alias = HUMAN_MODEL_ALIASES[normalizeModelName(value)];
  return alias || resolveModelId(value);
};

const selectFromDepartmentModels = (department, classification) => {
  const models = department?.default_models || {};
  const taskType = classification.task_type;
  const complexity = classification.complexity;

  if (taskType === "summarization") {
    return models.quick || models.simple || models.default || null;
  }

  if (taskType === "diagnosis") {
    return models.troubleshooting || models.complex || models.deep || null;
  }

  if (taskType === "deployment" || taskType === "provisioning") {
    return models.iac || models.complex || models.default || null;
  }

  if (classification.department === "research") {
    return models.deep || models.primary || models.quick || null;
  }

  if (complexity === "low") {
    return models.simple || models.quick || models.commits || models.default || null;
  }

  return (
    models.complex ||
    models.deep ||
    models.iac ||
    models.troubleshooting ||
    models.simple ||
    models.quick ||
    models.default ||
    null
  );
};

export const getIdentity = async () => readParsedIntent();

export const getDepartmentIdentity = async (departmentName) => {
  const identity = await getIdentity();
  return identity.departments?.[departmentName] || null;
};

export const pickDepartmentModel = (identity, classification) => {
  const department = identity.departments?.[classification.department];
  const humanName = selectFromDepartmentModels(department, classification);
  return humanName ? resolveHumanModel(humanName) : null;
};
