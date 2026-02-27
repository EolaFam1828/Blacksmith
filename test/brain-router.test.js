import assert from "node:assert/strict";
import test from "node:test";
import { routeBrainQuery } from "../src/brain/router.js";

test("routes model queries to models notebook", () => {
  const notebooks = routeBrainQuery("what models are available?");
  assert.ok(notebooks.includes("models"));
});

test("routes error queries to errors notebook", () => {
  const notebooks = routeBrainQuery("fix this error stack trace");
  assert.ok(notebooks.includes("errors"));
});

test("routes engineering queries to history-engineering", () => {
  const notebooks = routeBrainQuery("review code architecture");
  assert.ok(notebooks.includes("history-engineering"));
});

test("routes research queries to history-research", () => {
  const notebooks = routeBrainQuery("compare tradeoffs for database");
  assert.ok(notebooks.includes("history-research"));
});

test("routes infrastructure queries to history-infrastructure", () => {
  const notebooks = routeBrainQuery("deploy kubernetes cluster");
  assert.ok(notebooks.includes("history-infrastructure"));
});

test("routes operations queries to history-operations", () => {
  const notebooks = routeBrainQuery("create commit for release");
  assert.ok(notebooks.includes("history-operations"));
});

test("falls back to reference and project-blacksmith for unknown queries", () => {
  const notebooks = routeBrainQuery("something completely unrelated");
  assert.deepEqual(notebooks, ["reference", "project-blacksmith"]);
});

test("classification-aware routing adds department notebook", () => {
  const classification = { department: "engineering", task_type: "implementation" };
  const notebooks = routeBrainQuery("something generic", classification);
  assert.ok(notebooks.includes("history-engineering"));
  assert.ok(notebooks.includes("reference"));
});

test("classification-aware routing adds errors for debugging", () => {
  const classification = { department: "engineering", task_type: "debugging" };
  const notebooks = routeBrainQuery("fix this bug", classification);
  assert.ok(notebooks.includes("errors"));
  assert.ok(notebooks.includes("history-engineering"));
});

test("classification-aware routing adds reference for refactor", () => {
  const classification = { department: "engineering", task_type: "refactor" };
  const notebooks = routeBrainQuery("extract utils", classification);
  assert.ok(notebooks.includes("reference"));
});

test("deduplicates notebooks", () => {
  const notebooks = routeBrainQuery("deploy kubernetes infrastructure");
  const unique = [...new Set(notebooks)];
  assert.equal(notebooks.length, unique.length);
});
