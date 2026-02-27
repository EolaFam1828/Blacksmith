import fs from "node:fs/promises";
import path from "node:path";
import { getEmbedding, cosineSimilarity, chunkText } from "./embeddings.js";
import { BLACKSMITH_HOME } from "../utils/paths.js";
import { loadBrainRegistry } from "../utils/config.js";

const VECTOR_INDEX_PATH = path.join(BLACKSMITH_HOME, "vector-index");
const INDEX_FILE = path.join(VECTOR_INDEX_PATH, "index.json");

const loadIndex = async () => {
  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { entries: [] };
  }
};

const saveIndex = async (index) => {
  await fs.mkdir(VECTOR_INDEX_PATH, { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(index), "utf8");
};

export const indexDocument = async (name, content, metadata = {}) => {
  const chunks = chunkText(content);
  const index = await loadIndex();

  index.entries = index.entries.filter((e) => e.source !== name);

  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk.text);
    index.entries.push({
      source: name,
      text: chunk.text,
      embedding,
      metadata,
      indexed_at: new Date().toISOString()
    });
  }

  await saveIndex(index);
  return { source: name, chunks: chunks.length };
};

export const searchIndex = async (query, { topK = 5, minScore = 0.3 } = {}) => {
  const queryEmbedding = await getEmbedding(query);
  const index = await loadIndex();

  if (index.entries.length === 0) {
    return [];
  }

  const scored = index.entries.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding)
  }));

  return scored
    .filter((e) => e.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ text, source, score }) => ({ text, source, score }));
};

export const indexAllNotebooks = async () => {
  const registry = await loadBrainRegistry();
  const results = [];

  for (const notebook of registry.notebooks) {
    try {
      const content = await fs.readFile(notebook.file, "utf8");
      if (content.trim().length === 0) continue;
      const result = await indexDocument(notebook.name, content, {
        kind: notebook.kind,
        description: notebook.description
      });
      results.push(result);
    } catch {
      results.push({ source: notebook.name, chunks: 0, error: "failed to index" });
    }
  }

  return { indexed: results.length, results };
};

export { loadIndex, saveIndex };
