/**
 * Blacksmith Classifier Accuracy Tests
 *
 * Tests the classifyTask() function directly for fast validation
 * of routing decisions. No CLI subprocess, no BLACKSMITH_HOME needed.
 *
 * Usage:
 *   node --test test/classifier-accuracy.test.js
 *
 * Environment:
 *   BLACKSMITH_CLI_DIR  Path to the blacksmith-cli source directory
 *                       (defaults to ~/.local/share/blacksmith-cli)
 */

import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// ─── Resolve classifier module ──────────────────────────────────
// Priority: BLACKSMITH_CLI_DIR env → cwd → standard install path

const candidates = [
  process.env.BLACKSMITH_CLI_DIR,
  process.cwd(),
  path.join(os.homedir(), ".local", "share", "blacksmith-cli"),
].filter(Boolean);

let classifyTask;
let resolvedFrom;

for (const base of candidates) {
  const modPath = path.join(base, "src", "orchestrator", "classifier.js");
  if (fs.existsSync(modPath)) {
    const mod = await import(modPath);
    classifyTask = mod.classifyTask;
    resolvedFrom = modPath;
    break;
  }
}

if (!classifyTask) {
  console.error(
    "Cannot find src/orchestrator/classifier.js\n" +
    "Checked:\n" +
    candidates.map((c) => `  ${path.join(c, "src/orchestrator/classifier.js")}`).join("\n") +
    "\n\nSet BLACKSMITH_CLI_DIR or run from inside the blacksmith repo."
  );
  process.exit(1);
}

test(`classifier resolved from: ${resolvedFrom}`, () => {
  assert.ok(typeof classifyTask === "function", "classifyTask should be a function");
});

// ─── Tier Detection ─────────────────────────────────────────────

test("tier: commit is always tier 1", () => {
  const result = classifyTask({ command: "commit", prompt: "generate commit" });
  assert.equal(result.tier, 1);
  assert.equal(result.passthrough, true);
});

test("tier: ask without --deep is tier 1", () => {
  const result = classifyTask({ command: "ask", prompt: "what is redis", deep: false });
  assert.equal(result.tier, 1);
  assert.equal(result.passthrough, true);
});

test("tier: ask with --deep is tier 2", () => {
  const result = classifyTask({ command: "ask", prompt: "what is redis", deep: true });
  assert.equal(result.tier, 2);
  assert.equal(result.passthrough, false);
});

test("tier: build is always tier 2", () => {
  const result = classifyTask({ command: "build", prompt: "hello world" });
  assert.equal(result.tier, 2);
});

test("tier: review is always tier 2", () => {
  const result = classifyTask({ command: "review", prompt: "review this" });
  assert.equal(result.tier, 2);
});

test("tier: research is always tier 2", () => {
  const result = classifyTask({ command: "research", prompt: "compare things" });
  assert.equal(result.tier, 2);
});

test("tier: deploy is always tier 2", () => {
  const result = classifyTask({ command: "deploy", prompt: "deploy to staging" });
  assert.equal(result.tier, 2);
});

// ─── Department Detection ───────────────────────────────────────

test("dept: research command routes to research", () => {
  const result = classifyTask({ command: "research", prompt: "best CI tools" });
  assert.equal(result.department, "research");
});

test("dept: compare command routes to research", () => {
  const result = classifyTask({ command: "compare", prompt: "postgres vs mysql" });
  assert.equal(result.department, "research");
});

test("dept: summarize command routes to research", () => {
  const result = classifyTask({ command: "summarize", prompt: "summarize doc" });
  assert.equal(result.department, "research");
});

test("dept: deploy command routes to infrastructure", () => {
  const result = classifyTask({ command: "deploy", prompt: "deploy app" });
  assert.equal(result.department, "infrastructure");
});

test("dept: diagnose command routes to infrastructure", () => {
  const result = classifyTask({ command: "diagnose", prompt: "check logs" });
  assert.equal(result.department, "infrastructure");
});

test("dept: provision command routes to infrastructure", () => {
  const result = classifyTask({ command: "provision", prompt: "setup server" });
  assert.equal(result.department, "infrastructure");
});

test("dept: commit command routes to operations", () => {
  const result = classifyTask({ command: "commit", prompt: "commit changes" });
  assert.equal(result.department, "operations");
});

test("dept: build defaults to engineering", () => {
  const result = classifyTask({ command: "build", prompt: "build a function" });
  assert.equal(result.department, "engineering");
});

test("dept: review defaults to engineering", () => {
  const result = classifyTask({ command: "review", prompt: "review code" });
  assert.equal(result.department, "engineering");
});

test("dept: debug defaults to engineering", () => {
  const result = classifyTask({ command: "debug", prompt: "find the bug" });
  assert.equal(result.department, "engineering");
});

test("dept: refactor defaults to engineering", () => {
  const result = classifyTask({ command: "refactor", prompt: "clean up code" });
  assert.equal(result.department, "engineering");
});

test("dept: ask with infra keywords routes to infrastructure (when deep)", () => {
  const result = classifyTask({
    command: "ask",
    prompt: "how to deploy terraform on kubernetes",
    deep: true,
  });
  assert.equal(result.department, "infrastructure");
});

test("dept: ask with research keywords routes to research (when deep)", () => {
  const result = classifyTask({
    command: "ask",
    prompt: "research the best benchmarks for analysis",
    deep: true,
  });
  assert.equal(result.department, "research");
});

test("dept: ask with ops keywords routes to operations (when deep)", () => {
  const result = classifyTask({
    command: "ask",
    prompt: "how to create a good commit and merge pr",
    deep: true,
  });
  assert.equal(result.department, "operations");
});

// ─── Complexity Detection ───────────────────────────────────────

test("complexity: simple ask is low", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.equal(result.complexity, "low");
});

test("complexity: build with API keyword is medium", () => {
  const result = classifyTask({ command: "build", prompt: "build an api endpoint" });
  assert.equal(result.complexity, "medium");
});

test("complexity: deploy with production is high", () => {
  const result = classifyTask({ command: "deploy", prompt: "deploy to production" });
  assert.equal(result.complexity, "high");
});

test("complexity: multi-file keyword triggers high", () => {
  const result = classifyTask({ command: "build", prompt: "multi-file architecture" });
  assert.equal(result.complexity, "high");
});

test("complexity: migration keyword triggers high", () => {
  const result = classifyTask({ command: "build", prompt: "database migration" });
  assert.equal(result.complexity, "high");
});

test("complexity: oauth keyword triggers high", () => {
  const result = classifyTask({ command: "build", prompt: "oauth integration" });
  assert.equal(result.complexity, "high");
});

test("complexity: refactor is at least high", () => {
  const result = classifyTask({ command: "refactor", prompt: "refactor utils" });
  assert.equal(result.complexity, "high");
});

test("complexity: research is at least high", () => {
  const result = classifyTask({ command: "research", prompt: "research options" });
  assert.equal(result.complexity, "high");
});

test("complexity: compare is at least high", () => {
  const result = classifyTask({ command: "compare", prompt: "compare A vs B" });
  assert.equal(result.complexity, "high");
});

test("complexity: review with files bumps to at least medium", () => {
  const result = classifyTask({
    command: "review",
    prompt: "review code",
    filePaths: ["src/index.js"],
  });
  assert.notEqual(result.complexity, "low");
});

test("complexity: debug with files bumps to at least medium", () => {
  const result = classifyTask({
    command: "debug",
    prompt: "debug issue",
    filePaths: ["src/app.js"],
  });
  assert.notEqual(result.complexity, "low");
});

// ─── Task Type Mapping ──────────────────────────────────────────

test("task_type: ask maps to raw_query", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.equal(result.task_type, "raw_query");
});

test("task_type: build maps to implementation", () => {
  const result = classifyTask({ command: "build", prompt: "build it" });
  assert.equal(result.task_type, "implementation");
});

test("task_type: review maps to code_review", () => {
  const result = classifyTask({ command: "review", prompt: "review it" });
  assert.equal(result.task_type, "code_review");
});

test("task_type: debug maps to debugging", () => {
  const result = classifyTask({ command: "debug", prompt: "debug it" });
  assert.equal(result.task_type, "debugging");
});

test("task_type: research maps to research", () => {
  const result = classifyTask({ command: "research", prompt: "research it" });
  assert.equal(result.task_type, "research");
});

test("task_type: compare maps to comparison", () => {
  const result = classifyTask({ command: "compare", prompt: "compare them" });
  assert.equal(result.task_type, "comparison");
});

test("task_type: summarize maps to summarization", () => {
  const result = classifyTask({ command: "summarize", prompt: "summarize it" });
  assert.equal(result.task_type, "summarization");
});

test("task_type: refactor maps to refactor", () => {
  const result = classifyTask({ command: "refactor", prompt: "refactor it" });
  assert.equal(result.task_type, "refactor");
});

test("task_type: commit maps to commit_message", () => {
  const result = classifyTask({ command: "commit", prompt: "commit" });
  assert.equal(result.task_type, "commit_message");
});

test("task_type: deploy maps to deployment", () => {
  const result = classifyTask({ command: "deploy", prompt: "deploy it" });
  assert.equal(result.task_type, "deployment");
});

test("task_type: diagnose maps to diagnosis", () => {
  const result = classifyTask({ command: "diagnose", prompt: "diagnose it" });
  assert.equal(result.task_type, "diagnosis");
});

test("task_type: provision maps to provisioning", () => {
  const result = classifyTask({ command: "provision", prompt: "provision it" });
  assert.equal(result.task_type, "provisioning");
});

// ─── Sub-Agent Requirements ─────────────────────────────────────

test("sub_agents_needed: refactor always 5", () => {
  const result = classifyTask({ command: "refactor", prompt: "refactor it" });
  assert.equal(result.sub_agents_needed, 5);
});

test("sub_agents_needed: high-complexity build is 2", () => {
  const result = classifyTask({ command: "build", prompt: "production multi-file system" });
  assert.equal(result.sub_agents_needed, 2);
});

test("sub_agents_needed: simple ask is 0", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.equal(result.sub_agents_needed, 0);
});

test("sub_agents_needed: commit is 0", () => {
  const result = classifyTask({ command: "commit", prompt: "commit" });
  assert.equal(result.sub_agents_needed, 0);
});

// ─── Checkpoint Requirements ────────────────────────────────────

test("requires_checkpoint: deploy always true", () => {
  const result = classifyTask({ command: "deploy", prompt: "deploy it" });
  assert.equal(result.requires_checkpoint, true);
});

test("requires_checkpoint: provision always true", () => {
  const result = classifyTask({ command: "provision", prompt: "provision it" });
  assert.equal(result.requires_checkpoint, true);
});

test("requires_checkpoint: high-complexity refactor is true", () => {
  const result = classifyTask({ command: "refactor", prompt: "multi-file migration" });
  assert.equal(result.requires_checkpoint, true);
});

test("requires_checkpoint: high-complexity build is true", () => {
  const result = classifyTask({ command: "build", prompt: "production architecture system" });
  assert.equal(result.requires_checkpoint, true);
});

test("requires_checkpoint: simple ask is false", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.equal(result.requires_checkpoint, false);
});

// ─── Context Estimation ─────────────────────────────────────────

test("context tokens: no files gives ~400", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.equal(result.estimated_context_tokens, 400);
});

test("context tokens: files multiply by 1500", () => {
  const result = classifyTask({
    command: "review",
    prompt: "review",
    filePaths: ["a.js", "b.js", "c.js"],
  });
  assert.equal(result.estimated_context_tokens, 4500);
});

test("context_needed: populated when filePaths given", () => {
  const result = classifyTask({
    command: "debug",
    prompt: "debug it",
    filePaths: ["src/app.js"],
  });
  assert.deepEqual(result.context_needed, ["src/app.js"]);
});

test("context_needed: empty when no files", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.deepEqual(result.context_needed, []);
});

// ─── Route Reason ───────────────────────────────────────────────

test("route_reason: commit has deterministic reason", () => {
  const result = classifyTask({ command: "commit", prompt: "commit" });
  assert.match(result.route_reason, /deterministic/);
});

test("route_reason: ask has passthrough reason", () => {
  const result = classifyTask({ command: "ask", prompt: "hello" });
  assert.match(result.route_reason, /passthrough/);
});

test("route_reason: build has orchestrated reason", () => {
  const result = classifyTask({ command: "build", prompt: "build it" });
  assert.match(result.route_reason, /orchestrated/);
});
