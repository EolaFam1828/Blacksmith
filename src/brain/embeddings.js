import { getOllamaEmbedding } from "../backends/ollama.js";

export const chunkText = (text, { chunkSize = 512, overlap = 64 } = {}) => {
  if (!text || text.length === 0) return [];

  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const chunks = [];
  let current = "";
  let overlapBuffer = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > chunkSize && current.length > 0) {
      chunks.push({ text: current.trim(), offset: chunks.length });
      overlapBuffer = current.slice(-overlap);
      current = overlapBuffer + " " + sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim().length > 0) {
    chunks.push({ text: current.trim(), offset: chunks.length });
  }

  return chunks;
};

export const getEmbedding = async (text, options = {}) => {
  return getOllamaEmbedding(text, options);
};

export const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;

  return dot / denominator;
};
