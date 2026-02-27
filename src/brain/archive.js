import fs from "node:fs/promises";
import path from "node:path";
import { loadBrainRegistry, saveBrainRegistry } from "../utils/config.js";
import { loadMcr } from "../utils/config.js";
import { getBlacksmithPath } from "../utils/paths.js";

const nowIso = () => new Date().toISOString();

export const archiveNotebook = async (name) => {
  const registry = await loadBrainRegistry();
  const notebook = registry.notebooks.find((entry) => entry.name === name);
  if (!notebook) {
    throw new Error(`Notebook '${name}' not found.`);
  }

  const content = await fs.readFile(notebook.file, "utf8");
  const archiveFile = path.join(getBlacksmithPath("archives"), `${name}-${Date.now()}.md`);
  await fs.writeFile(archiveFile, content, "utf8");
  await fs.writeFile(
    notebook.file,
    `# ${name}\n\nArchived on ${nowIso()}.\n\nLatest archive: ${archiveFile}\n`,
    "utf8"
  );

  return {
    notebook: name,
    archive: archiveFile
  };
};

export const refreshBrainSources = async () => {
  const registry = await loadBrainRegistry();
  const mcr = await loadMcr();
  const modelsNotebook = registry.notebooks.find((entry) => entry.name === "models");
  if (modelsNotebook) {
    const modelEntries = Object.entries(mcr.models || {}).map(([name, details]) => {
      const strengths = (details.strengths || []).join(", ");
      return `- ${name}: ${strengths}`;
    });
    const content = [
      "# Models",
      "",
      `Refreshed: ${nowIso()}`,
      "",
      ...modelEntries
    ].join("\n");
    await fs.writeFile(modelsNotebook.file, `${content}\n`, "utf8");
  }

  registry.last_refreshed = nowIso();
  await saveBrainRegistry(registry);
  return registry;
};
