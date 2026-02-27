import fs from "node:fs/promises";
import path from "node:path";
import { loadBrainRegistry, saveBrainRegistry } from "../utils/config.js";
import { loadMcr } from "../utils/config.js";
import { archiveNotebook, refreshBrainSources } from "./archive.js";
import { routeBrainQuery } from "./router.js";

const resolveNotebook = async (name) => {
  const registry = await loadBrainRegistry();
  const notebook = registry.notebooks.find((entry) => entry.name === name);
  if (!notebook) {
    throw new Error(`Notebook '${name}' not found.`);
  }
  return { notebook, registry };
};

const scoreMatches = (query, content) => {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter(Boolean);

  return terms.reduce((total, term) => {
    const count = content.toLowerCase().split(term).length - 1;
    return total + count;
  }, 0);
};

const excerptContent = (query, content) => {
  const lines = content.split("\n");
  const ranked = lines
    .map((line) => ({ line, score: scoreMatches(query, line) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.line.trim())
    .filter(Boolean);

  return ranked.length > 0 ? ranked.join("\n") : content.split("\n").slice(0, 12).join("\n");
};

export const initBrain = async () => {
  const registry = await loadBrainRegistry();
  const modelsNotebook = registry.notebooks.find((entry) => entry.name === "models");
  if (modelsNotebook) {
    const mcr = await loadMcr();
    const modelNames = Object.keys(mcr.models || {});
    const body = [
      "# Models",
      "",
      "Seeded from the local MCR.",
      "",
      ...modelNames.map((name) => `- ${name}`)
    ].join("\n");
    await fs.writeFile(modelsNotebook.file, `${body}\n`, "utf8");
  }
  return registry;
};

export const listNotebooks = async () => {
  const registry = await loadBrainRegistry();
  return Promise.all(
    registry.notebooks.map(async (entry) => {
      const raw = await fs.readFile(entry.file, "utf8");
      const stat = await fs.stat(entry.file);
      return {
        ...entry,
        size_bytes: Buffer.byteLength(raw),
        line_count: raw.split("\n").length,
        updated_at: stat.mtime.toISOString()
      };
    })
  );
};

export const queryNotebook = async (name, query) => {
  const { notebook } = await resolveNotebook(name);
  const content = await fs.readFile(notebook.file, "utf8");
  return {
    notebook: name,
    query,
    excerpt: excerptContent(query, content)
  };
};

export const queryBrain = async (query) => {
  const notebooks = routeBrainQuery(query);
  const results = await Promise.all(notebooks.map((name) => queryNotebook(name, query)));
  return {
    query,
    notebooks,
    results
  };
};

export const listNotebookSources = async (name) => {
  const { notebook } = await resolveNotebook(name);
  const content = await fs.readFile(notebook.file, "utf8");
  const matches = [...content.matchAll(/^Source:\s+(.+)$/gm)];
  return matches.map((match) => match[1]);
};

export const addNotebookSource = async (name, sourcePath) => {
  const { notebook } = await resolveNotebook(name);
  const absolutePath = path.resolve(sourcePath);
  const sourceContent = await fs.readFile(absolutePath, "utf8");
  const existing = await fs.readFile(notebook.file, "utf8");
  const block = [
    "",
    `## Imported ${new Date().toISOString()}`,
    `Source: ${absolutePath}`,
    "",
    "```text",
    sourceContent.trimEnd(),
    "```",
    ""
  ].join("\n");
  await fs.writeFile(notebook.file, `${existing.trimEnd()}\n${block}`, "utf8");
  return { notebook: name, source: absolutePath };
};

export const appendTaskSummary = async (name, markdown) => {
  const { notebook } = await resolveNotebook(name);
  const existing = await fs.readFile(notebook.file, "utf8");
  await fs.writeFile(notebook.file, `${existing.trimEnd()}\n\n${markdown.trim()}\n`, "utf8");
};

export const brainHealth = async () => {
  const notebooks = await listNotebooks();
  return {
    notebooks: notebooks.length,
    empty_notebooks: notebooks.filter((entry) => entry.size_bytes < 100).map((entry) => entry.name),
    stale_notebooks: notebooks
      .filter((entry) => Date.now() - new Date(entry.updated_at).getTime() > 1000 * 60 * 60 * 24 * 30)
      .map((entry) => entry.name),
    total_bytes: notebooks.reduce((total, entry) => total + entry.size_bytes, 0),
    warnings: notebooks
      .filter((entry) => entry.size_bytes < 100)
      .map((entry) => `${entry.name} is nearly empty`)
  };
};

export const addProjectNotebook = async (name) => {
  const registry = await loadBrainRegistry();
  const notebookName = `project-${name}`;
  if (registry.notebooks.some((entry) => entry.name === notebookName)) {
    return registry;
  }

  const file = path.join(path.dirname(registry.notebooks[0].file), `${notebookName}.md`);
  await fs.writeFile(file, `# ${notebookName}\n\nProject notebook initialized by Blacksmith.\n`, "utf8");
  registry.notebooks.push({
    name: notebookName,
    kind: "project",
    file,
    description: `${name} project knowledge`
  });
  await saveBrainRegistry(registry);
  return registry;
};

export const refreshBrain = async () => refreshBrainSources();

export const archiveBrainNotebook = async (name) => archiveNotebook(name);
