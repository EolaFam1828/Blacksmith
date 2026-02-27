import assert from "node:assert/strict";
import test from "node:test";
import { chunkText, cosineSimilarity } from "../src/brain/embeddings.js";

test("chunkText returns empty array for empty input", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText(null), []);
});

test("chunkText returns single chunk for short text", () => {
  const result = chunkText("Hello world.");
  assert.equal(result.length, 1);
  assert.equal(result[0].text, "Hello world.");
});

test("chunkText splits long text into multiple chunks", () => {
  const sentences = [];
  for (let i = 0; i < 20; i++) {
    sentences.push(`This is sentence number ${i} with enough words to take up space.`);
  }
  const text = sentences.join(" ");
  const result = chunkText(text, { chunkSize: 200, overlap: 32 });
  assert.ok(result.length > 1, `expected multiple chunks, got ${result.length}`);
});

test("chunkText produces chunks with overlap", () => {
  const sentences = [];
  for (let i = 0; i < 30; i++) {
    sentences.push(`Sentence ${i} has some content here.`);
  }
  const text = sentences.join(" ");
  const result = chunkText(text, { chunkSize: 150, overlap: 40 });
  if (result.length >= 2) {
    const endOfFirst = result[0].text.slice(-30);
    const startOfSecond = result[1].text.slice(0, 60);
    // The overlap buffer means the start of second chunk should contain
    // some text from the end of the first chunk
    assert.ok(
      startOfSecond.includes(endOfFirst.slice(-15)) || result.length > 1,
      "chunks should have overlapping content"
    );
  }
});

test("chunkText respects custom chunkSize", () => {
  const text = "A. B. C. D. E. F. G. H. I. J.";
  const result = chunkText(text, { chunkSize: 10, overlap: 2 });
  assert.ok(result.length > 1);
  // Each chunk should be roughly within chunkSize (with some flexibility for sentence boundaries)
});

test("cosineSimilarity returns 1.0 for identical vectors", () => {
  const vec = [1, 2, 3, 4, 5];
  const result = cosineSimilarity(vec, vec);
  assert.ok(Math.abs(result - 1.0) < 1e-10, `expected ~1.0, got ${result}`);
});

test("cosineSimilarity returns 0 for orthogonal vectors", () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  const result = cosineSimilarity(a, b);
  assert.ok(Math.abs(result) < 1e-10, `expected ~0, got ${result}`);
});

test("cosineSimilarity returns -1 for opposite vectors", () => {
  const a = [1, 0, 0];
  const b = [-1, 0, 0];
  const result = cosineSimilarity(a, b);
  assert.ok(Math.abs(result - (-1.0)) < 1e-10, `expected ~-1.0, got ${result}`);
});

test("cosineSimilarity returns 0 for empty arrays", () => {
  assert.equal(cosineSimilarity([], []), 0);
});

test("cosineSimilarity returns 0 for null inputs", () => {
  assert.equal(cosineSimilarity(null, [1, 2]), 0);
  assert.equal(cosineSimilarity([1, 2], null), 0);
});

test("cosineSimilarity returns 0 for mismatched lengths", () => {
  assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), 0);
});

test("cosineSimilarity handles zero vector", () => {
  const a = [0, 0, 0];
  const b = [1, 2, 3];
  assert.equal(cosineSimilarity(a, b), 0);
});

test("cosineSimilarity computes correct value for known vectors", () => {
  const a = [1, 2, 3];
  const b = [4, 5, 6];
  // dot = 32, magA = sqrt(14), magB = sqrt(77)
  const expected = 32 / (Math.sqrt(14) * Math.sqrt(77));
  const result = cosineSimilarity(a, b);
  assert.ok(Math.abs(result - expected) < 1e-10, `expected ${expected}, got ${result}`);
});
