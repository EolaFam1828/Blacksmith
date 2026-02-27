import assert from "node:assert/strict";
import test from "node:test";
import { buildOrchestrateParams } from "../src/tui/hooks.js";

test("buildOrchestrateParams creates correct params for ask command", () => {
  const params = buildOrchestrateParams("ask", "what is 2+2");

  assert.equal(params.command, "ask");
  assert.equal(params.task, "what is 2+2");
  assert.equal(params.dryRun, false);
  assert.equal(params.force, false);
  assert.deepEqual(params.filePaths, []);
  assert.equal(params.explicitBackend, undefined);
  assert.equal(params.explicitModel, undefined);
});

test("buildOrchestrateParams generates default task for commit", () => {
  const params = buildOrchestrateParams("commit", "");

  assert.equal(params.command, "commit");
  assert.match(params.task, /commit message/i);
});

test("buildOrchestrateParams uses provided task over default", () => {
  const params = buildOrchestrateParams("build", "a REST API");

  assert.equal(params.command, "build");
  assert.equal(params.task, "a REST API");
});

test("buildOrchestrateParams handles all workflow commands", () => {
  const cmds = ["ask", "build", "research", "debug", "review", "deploy", "commit"];

  for (const cmd of cmds) {
    const params = buildOrchestrateParams(cmd, "test task");
    assert.equal(params.command, cmd);
    assert.ok(params.task.length > 0);
  }
});
