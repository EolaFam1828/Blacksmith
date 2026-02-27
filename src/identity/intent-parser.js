import fs from "node:fs/promises";
import { getIntentPath } from "../utils/config.js";

let cachedIdentity = null;
let cachedMtimeMs = null;

const cleanInline = (value) =>
  value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();

const normalizeKey = (value) =>
  cleanInline(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getSection = (contents, heading) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, "m");
  const match = contents.match(regex);
  return match ? match[1].trim() : null;
};

const extractBulletLines = (section) =>
  (section || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));

const extractLabeledBullets = (section) => {
  const entries = {};
  for (const line of extractBulletLines(section)) {
    const match = line.match(/^-+\s+(?:\*\*)?([^:*]+?)(?:\*\*)?:\s*(.+)$/);
    if (!match) {
      continue;
    }

    entries[normalizeKey(match[1])] = cleanInline(match[2]);
  }
  return entries;
};

const parseDefaultModels = (value) => {
  if (!value) {
    return {};
  }

  const models = {};
  for (const part of value.split(",")) {
    const match = part.trim().match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      models[normalizeKey(match[2])] = cleanInline(match[1]);
      continue;
    }

    models[normalizeKey(part)] = cleanInline(part);
  }

  return models;
};

const parseMethodology = (value) =>
  (value || "")
    .split(/\s*(?:->|→)\s*/g)
    .map((item) => cleanInline(item))
    .filter(Boolean);

const parseDepartmentBlock = (name, block) => {
  const values = extractLabeledBullets(block);
  return {
    focus: values.focus || "",
    default_models: parseDefaultModels(values.default_models),
    review_standard: values.review_standard || "",
    output_standard: values.output_standard || "",
    safety_standard: values.safety_standard || "",
    automation_level: values.automation_level || "",
    methodology: parseMethodology(values.methodology)
  };
};

const parseDepartments = (section) => {
  const departments = {};
  if (!section) {
    return departments;
  }

  const matches = [...section.matchAll(/^###\s+(.+)$/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const start = current.index + current[0].length;
    const end = matches[index + 1]?.index ?? section.length;
    const name = cleanInline(current[1]);
    departments[normalizeKey(name)] = parseDepartmentBlock(name, section.slice(start, end).trim());
  }

  return departments;
};

const parseOwner = (section) => {
  const values = extractLabeledBullets(section);
  return {
    name: values.name || "",
    role: values.role || "",
    technical_depth: values.technical_depth || "",
    projects: values.projects ? values.projects.split(",").map((item) => item.trim()).filter(Boolean) : [],
    communication_style: values.communication_style || "",
    decision_framework: values.decision_framework || ""
  };
};

const parseTextSection = (section) =>
  (section || "")
    .replace(/\n+/g, " ")
    .trim();

const parseListSection = (section) =>
  extractBulletLines(section).map((line) =>
    cleanInline(line.replace(/^-+\s+/, "").replace(/^[^:]+:\s*/, ""))
  );

const parseFileTree = (section) => {
  if (!section) {
    return null;
  }

  const cleaned = section
    .replace(/<!--.*?-->/g, "")
    .replace(/```(?:text)?/g, "")
    .replace(/_Run `blacksmith map` to populate this section\._/g, "")
    .trim();

  return cleaned || null;
};

export const parseIntentContents = (contents) => {
  const warnings = [];
  const mission = getSection(contents, "Mission");
  const vision = getSection(contents, "Vision");
  const values = getSection(contents, "Values");
  const principles = getSection(contents, "Principles");
  const ownerContext = getSection(contents, "Owner Context");
  const departmentsSection =
    getSection(contents, "Departments (Sub-Agent Architecture)") || getSection(contents, "Departments");
  const fileTreeSection = getSection(contents, "File Tree (Project Map)");

  if (!mission) warnings.push("Missing Mission section in Intent.md");
  if (!departmentsSection) warnings.push("Missing Departments section in Intent.md");

  return {
    mission: parseTextSection(mission),
    vision: parseTextSection(vision),
    values: parseListSection(values),
    principles: parseListSection(principles),
    owner: parseOwner(ownerContext),
    departments: parseDepartments(departmentsSection),
    file_tree: parseFileTree(fileTreeSection),
    warnings
  };
};

export const readParsedIntent = async ({ force = false } = {}) => {
  const filePath = getIntentPath();
  const stat = await fs.stat(filePath);

  if (!force && cachedIdentity && cachedMtimeMs === stat.mtimeMs) {
    return cachedIdentity;
  }

  const contents = await fs.readFile(filePath, "utf8");
  cachedIdentity = parseIntentContents(contents);
  cachedMtimeMs = stat.mtimeMs;
  return cachedIdentity;
};

export const clearIntentCache = () => {
  cachedIdentity = null;
  cachedMtimeMs = null;
};
