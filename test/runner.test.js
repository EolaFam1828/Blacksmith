import assert from "node:assert/strict";
import test from "node:test";
import { executeAgentSpec, runPrimaryAgent, runSubAgent } from "../src/agents/runner.js";

test("executeAgentSpec returns success:false on timeout", async () => {
  const spec = {
    runtime: { backend: "ollama", model: "ollama-qwen2.5-coder" },
    context: { cwd: process.cwd() }
  };

  const result = await executeAgentSpec(spec, "hello", {
    timeout: 1,
    showSpinner: false,
    backend: "ollama",
    model: "ollama-qwen2.5-coder"
  });

  assert.equal(result.success, false);
  assert.match(result.text, /Agent (failed|timed out)/);
  assert.ok(result.duration_ms >= 0);
});

test("executeAgentSpec returns proper structure on backend failure", async () => {
  const spec = {
    runtime: { backend: "nonexistent", model: "nonexistent" },
    context: { cwd: process.cwd() }
  };

  const result = await executeAgentSpec(spec, "hello", {
    showSpinner: false,
    backend: "nonexistent",
    model: "nonexistent"
  });

  assert.equal(result.success, false);
  assert.equal(typeof result.text, "string");
  assert.equal(typeof result.duration_ms, "number");
  assert.deepEqual(result.usage, { prompt_tokens: 0, completion_tokens: 0 });
});

test("runSubAgent adds name and kind to result", async () => {
  try {
    await runSubAgent({
      backend: "nonexistent",
      model: "nonexistent",
      prompt: "test",
      options: {},
      name: "TestAgent",
      kind: "test"
    });
    assert.fail("Should have thrown");
  } catch (error) {
    assert.ok(error instanceof Error);
  }
});
