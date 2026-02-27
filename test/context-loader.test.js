import assert from "node:assert/strict";
import test from "node:test";
import { truncateContext, estimateTokens, estimateContextTokens } from "../src/orchestrator/context-loader.js";

test("estimateTokens returns ceil(length / 4)", () => {
  assert.equal(estimateTokens("abcdefgh"), 2);
  assert.equal(estimateTokens("a"), 1);
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens(null), 0);
});

test("estimateContextTokens counts all fields correctly", () => {
  const context = {
    files: [
      { path: "a.js", content: "a".repeat(400) },
      { path: "b.js", content: "b".repeat(200) }
    ],
    stagedDiff: "d".repeat(100),
    prDiff: "p".repeat(80),
    packageJson: "j".repeat(40),
    recentChanges: "r".repeat(60),
    blame: {
      "a.js": "x".repeat(120),
      "b.js": "y".repeat(80)
    }
  };

  const expected =
    Math.ceil(400 / 4) +
    Math.ceil(200 / 4) +
    Math.ceil(100 / 4) +
    Math.ceil(80 / 4) +
    Math.ceil(40 / 4) +
    Math.ceil(60 / 4) +
    Math.ceil(120 / 4) +
    Math.ceil(80 / 4);

  assert.equal(estimateContextTokens(context), expected);
});

test("truncateContext returns context unchanged when under budget", () => {
  const context = {
    files: [{ path: "a.js", content: "hello" }],
    stagedDiff: "diff",
    prDiff: null,
    packageJson: "{}",
    recentChanges: "abc",
    blame: { "a.js": "blame" }
  };
  const result = truncateContext(context, 100000);
  assert.deepEqual(result.files, context.files);
  assert.equal(result.stagedDiff, context.stagedDiff);
  assert.equal(result.blame["a.js"], context.blame["a.js"]);
});

test("truncateContext returns context unchanged when maxTokens is 0", () => {
  const context = { files: [{ path: "a.js", content: "x".repeat(1000) }], blame: {} };
  const result = truncateContext(context, 0);
  assert.equal(result.files[0].content, context.files[0].content);
});

test("truncateContext returns context unchanged when maxTokens is null", () => {
  const context = { files: [{ path: "a.js", content: "x".repeat(1000) }], blame: {} };
  const result = truncateContext(context, null);
  assert.equal(result.files[0].content, context.files[0].content);
});

test("truncateContext drops blame first", () => {
  const context = {
    files: [{ path: "a.js", content: "a".repeat(100) }],
    stagedDiff: null,
    prDiff: null,
    packageJson: null,
    recentChanges: null,
    blame: { "a.js": "b".repeat(400) }
  };
  // Total: 25 (file) + 100 (blame) = 125 tokens
  const result = truncateContext(context, 30);
  assert.deepEqual(result.blame, {});
  assert.equal(result.files[0].content, context.files[0].content);
});

test("truncateContext drops fields in priority order", () => {
  const context = {
    files: [{ path: "a.js", content: "a".repeat(40) }],
    stagedDiff: "s".repeat(40),
    prDiff: "p".repeat(40),
    packageJson: "j".repeat(40),
    recentChanges: "r".repeat(40),
    blame: { "a.js": "b".repeat(40) }
  };
  // Each field is 10 tokens, total 60 tokens
  // Budget = 20 tokens, need to drop 40 tokens
  // Should drop blame (10), recentChanges (10), prDiff (10), stagedDiff (10)
  const result = truncateContext(context, 20);
  assert.deepEqual(result.blame, {});
  assert.equal(result.recentChanges, null);
  assert.equal(result.prDiff, null);
  assert.equal(result.stagedDiff, null);
  // files and packageJson should survive
  assert.equal(result.files[0].content, context.files[0].content);
  assert.equal(result.packageJson, context.packageJson);
});

test("truncateContext truncates individual files as last resort", () => {
  const context = {
    files: [
      { path: "a.js", content: "a".repeat(400) },
      { path: "b.js", content: "b".repeat(400) }
    ],
    stagedDiff: null,
    prDiff: null,
    packageJson: null,
    recentChanges: null,
    blame: {}
  };
  // Total: 200 tokens (100 + 100)
  // Budget: 120 tokens, need to free 80 tokens
  // Should truncate files (last priority), starting from end
  const result = truncateContext(context, 120);
  // b.js (last file) should be truncated or nulled
  assert.ok(
    result.files[1].content === null || result.files[1].content.length < 400,
    "last file should be truncated"
  );
  // a.js should be preserved or partially truncated
  assert.ok(result.files[0].content !== null, "first file should survive");
});

test("truncateContext does not mutate original context", () => {
  const context = {
    files: [{ path: "a.js", content: "a".repeat(400) }],
    stagedDiff: "s".repeat(400),
    prDiff: null,
    packageJson: null,
    recentChanges: null,
    blame: { "a.js": "b".repeat(400) }
  };
  const originalBlame = { ...context.blame };
  truncateContext(context, 10);
  assert.deepEqual(context.blame, originalBlame);
  assert.equal(context.files[0].content, "a".repeat(400));
});
