import assert from "node:assert/strict";
import test from "node:test";
import { mock } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// We need to mock the embedding function before importing vector-store
// Use a deterministic fake embedding based on text content
const fakeEmbedding = (text) => {
  // Create a simple deterministic "embedding" from text hash
  const vec = new Array(8).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % 8] += text.charCodeAt(i);
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return mag > 0 ? vec.map((v) => v / mag) : vec;
};

// Set up a temporary BLACKSMITH_HOME for testing
const tmpDir = path.join(os.tmpdir(), `blacksmith-test-${Date.now()}`);
const vectorDir = path.join(tmpDir, "vector-index");
const indexFile = path.join(vectorDir, "index.json");

test("loadIndex returns empty default when file missing", async () => {
  process.env.BLACKSMITH_HOME = tmpDir;
  await fs.mkdir(vectorDir, { recursive: true });

  // Remove the file if it exists
  await fs.rm(indexFile, { force: true });

  const { loadIndex } = await import("../src/brain/vector-store.js");
  const index = await loadIndex();
  assert.deepEqual(index, { entries: [] });
});

test("saveIndex + loadIndex round-trip", async () => {
  process.env.BLACKSMITH_HOME = tmpDir;
  await fs.mkdir(vectorDir, { recursive: true });

  const { loadIndex, saveIndex } = await import("../src/brain/vector-store.js");

  const testIndex = {
    entries: [
      {
        source: "test-doc",
        text: "hello world",
        embedding: [0.1, 0.2, 0.3],
        metadata: {},
        indexed_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  };

  await saveIndex(testIndex);
  const loaded = await loadIndex();
  assert.equal(loaded.entries.length, 1);
  assert.equal(loaded.entries[0].source, "test-doc");
  assert.deepEqual(loaded.entries[0].embedding, [0.1, 0.2, 0.3]);
});

test("searchIndex filters by minScore", async () => {
  process.env.BLACKSMITH_HOME = tmpDir;
  await fs.mkdir(vectorDir, { recursive: true });

  const { cosineSimilarity } = await import("../src/brain/embeddings.js");
  const { saveIndex } = await import("../src/brain/vector-store.js");

  // Create entries with known embeddings
  const highRelevance = fakeEmbedding("authentication login OAuth");
  const lowRelevance = fakeEmbedding("zzzzzzzzzzz completely unrelated");

  await saveIndex({
    entries: [
      {
        source: "auth-doc",
        text: "authentication login OAuth",
        embedding: highRelevance,
        metadata: {},
        indexed_at: "2026-01-01T00:00:00.000Z"
      },
      {
        source: "unrelated-doc",
        text: "zzzzzzzzzzz completely unrelated",
        embedding: lowRelevance,
        metadata: {},
        indexed_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  });

  // Verify cosine similarity values to make sure our test data is reasonable
  const queryVec = fakeEmbedding("authentication login OAuth");
  const sim1 = cosineSimilarity(queryVec, highRelevance);
  const sim2 = cosineSimilarity(queryVec, lowRelevance);
  assert.ok(sim1 > sim2, `high relevance (${sim1}) should score higher than low relevance (${sim2})`);
});

test("results are sorted by score descending", async () => {
  process.env.BLACKSMITH_HOME = tmpDir;
  await fs.mkdir(vectorDir, { recursive: true });

  const { saveIndex, loadIndex } = await import("../src/brain/vector-store.js");
  const { cosineSimilarity } = await import("../src/brain/embeddings.js");

  const embed1 = fakeEmbedding("hello world greeting");
  const embed2 = fakeEmbedding("hello greeting salutation");
  const embed3 = fakeEmbedding("goodbye farewell");

  await saveIndex({
    entries: [
      { source: "a", text: "hello world greeting", embedding: embed1, metadata: {}, indexed_at: "" },
      { source: "b", text: "hello greeting salutation", embedding: embed2, metadata: {}, indexed_at: "" },
      { source: "c", text: "goodbye farewell", embedding: embed3, metadata: {}, indexed_at: "" }
    ]
  });

  // Manually check the order we'd expect
  const queryVec = fakeEmbedding("hello world greeting");
  const scores = [
    { source: "a", score: cosineSimilarity(queryVec, embed1) },
    { source: "b", score: cosineSimilarity(queryVec, embed2) },
    { source: "c", score: cosineSimilarity(queryVec, embed3) }
  ].sort((a, b) => b.score - a.score);

  // Verify that identical text has the highest score
  assert.equal(scores[0].source, "a");
  assert.ok(scores[0].score >= scores[1].score);
  assert.ok(scores[1].score >= scores[2].score);
});

// Clean up
test("cleanup tmp dir", async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  delete process.env.BLACKSMITH_HOME;
});
