import assert from "node:assert/strict";
import test from "node:test";
import { planSubAgents, summarizeSubAgentResults, shouldRequestCheckpoint } from "../src/agents/sub-agent.js";

test("planSubAgents returns 5 agents for refactor", () => {
  const agents = planSubAgents({
    classification: { task_type: "refactor", complexity: "high" },
    task: "extract helpers"
  });

  assert.equal(agents.length, 5);
  assert.equal(agents[0].kind, "research");
  assert.equal(agents[2].kind, "plan");
  assert.equal(agents[4].kind, "review");
});

test("planSubAgents returns 2 agents for high-complexity build", () => {
  const agents = planSubAgents({
    classification: { task_type: "implementation", complexity: "high" },
    task: "build auth system"
  });

  assert.equal(agents.length, 2);
  assert.equal(agents[0].kind, "plan");
  assert.equal(agents[1].kind, "tests");
});

test("planSubAgents returns empty for low-complexity task", () => {
  const agents = planSubAgents({
    classification: { task_type: "raw_query", complexity: "low" },
    task: "hello"
  });

  assert.equal(agents.length, 0);
});

test("shouldRequestCheckpoint returns true for checkpoint steps", () => {
  assert.ok(shouldRequestCheckpoint({ checkpoint: true }));
  assert.ok(shouldRequestCheckpoint({ destructive: true }));
  assert.ok(!shouldRequestCheckpoint({ checkpoint: false, destructive: false }));
  assert.ok(!shouldRequestCheckpoint({}));
});

test("summarizeSubAgentResults formats results correctly", () => {
  const results = [
    { name: "Research", model: "gemini-2.5-pro", text: "Found best practices" },
    { name: "Plan", model: "claude-code", text: "Step 1: Extract" }
  ];

  const summary = summarizeSubAgentResults(results);
  assert.match(summary, /### Research/);
  assert.match(summary, /gemini-2.5-pro/);
  assert.match(summary, /### Plan/);
  assert.match(summary, /claude-code/);
});

test("refactor agents include checkpoint flag on plan step", () => {
  const agents = planSubAgents({
    classification: { task_type: "refactor", complexity: "high" },
    task: "refactor utils"
  });

  const planAgent = agents.find((a) => a.kind === "plan");
  assert.ok(planAgent);
  assert.ok(planAgent.checkpoint);
});
