/**
 * Blacksmith Classifier — Short-Task Guard Tests
 *
 * Verifies that obviously incomplete / too-short tasks are downgraded
 * from Tier 2 to Tier 1 (free ollama passthrough) so users still get
 * a response without wasting money on the full agent pipeline.
 *
 * Usage:
 *   node --test test/classifier.test.js
 */

import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

// ─── Resolve classifier module ──────────────────────────────────

const candidates = [
  process.env.BLACKSMITH_CLI_DIR,
  process.cwd(),
  path.join(os.homedir(), ".local", "share", "blacksmith-cli"),
].filter(Boolean);

let classifyTask;

for (const base of candidates) {
  const modPath = path.join(base, "src", "orchestrator", "classifier.js");
  if (fs.existsSync(modPath)) {
    const mod = await import(modPath);
    classifyTask = mod.classifyTask;
    break;
  }
}

if (!classifyTask) {
  console.error(
    "Cannot find src/orchestrator/classifier.js\n" +
    "Set BLACKSMITH_CLI_DIR or run from inside the blacksmith repo."
  );
  process.exit(1);
}

// ─── Short-Task Guard: Tier Downgrade ───────────────────────────

test("short-task: 'build' + 'me a' (2 words) → tier 1", () => {
  const result = classifyTask({ command: "build", prompt: "me a" });
  assert.equal(result.tier, 1);
  assert.equal(result.passthrough, true);
});

test("short-task: 'build' + '' (empty) → tier 1", () => {
  const result = classifyTask({ command: "build", prompt: "" });
  assert.equal(result.tier, 1);
  assert.equal(result.passthrough, true);
});

test("short-task: 'build' + 'a' (single word) → tier 1", () => {
  const result = classifyTask({ command: "build", prompt: "a" });
  assert.equal(result.tier, 1);
  assert.equal(result.passthrough, true);
});

test("short-task: 'build' + 'a REST API' (3 words) → tier 2", () => {
  const result = classifyTask({ command: "build", prompt: "a REST API" });
  assert.equal(result.tier, 2);
  assert.equal(result.passthrough, false);
});

test("short-task: 'refactor' + 'it' (too short) → tier 1", () => {
  const result = classifyTask({ command: "refactor", prompt: "it" });
  assert.equal(result.tier, 1);
  assert.equal(result.passthrough, true);
});

test("short-task: 'debug' + 'the login flow' (3 words) → tier 2", () => {
  const result = classifyTask({ command: "debug", prompt: "the login flow" });
  assert.equal(result.tier, 2);
  assert.equal(result.passthrough, false);
});
