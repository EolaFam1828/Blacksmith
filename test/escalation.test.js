import assert from "node:assert/strict";
import test from "node:test";
import { shouldEscalate, getEscalationTarget } from "../src/orchestrator/escalation.js";

test("shouldEscalate returns true for empty response", () => {
  const result = { text: "" };
  const classification = { complexity: "high" };
  assert.ok(shouldEscalate(result, classification));
});

test("shouldEscalate returns true for error-like response", () => {
  const result = { text: "Error: something went wrong" };
  const classification = { complexity: "medium" };
  assert.ok(shouldEscalate(result, classification));
});

test("shouldEscalate returns true for too-short high-complexity response", () => {
  const result = { text: "OK" };
  const classification = { complexity: "high" };
  assert.ok(shouldEscalate(result, classification));
});

test("shouldEscalate returns false for adequate response", () => {
  const longText = "a".repeat(700);
  const result = { text: longText };
  const classification = { complexity: "high" };
  assert.ok(!shouldEscalate(result, classification));
});

test("shouldEscalate returns false when auto_escalate is disabled", () => {
  const result = { text: "" };
  const classification = { complexity: "high" };
  assert.ok(!shouldEscalate(result, classification, { autoEscalate: false }));
});

test("shouldEscalate returns false when explicit backend is set", () => {
  const result = { text: "" };
  const classification = { complexity: "high" };
  assert.ok(!shouldEscalate(result, classification, { explicitBackend: "ollama" }));
});

test("getEscalationTarget follows the correct chain", () => {
  assert.equal(getEscalationTarget("ollama-qwen2.5-coder"), "gemini-2.0-flash");
  assert.equal(getEscalationTarget("ollama-deepseek-r1"), "o3-mini");
  assert.equal(getEscalationTarget("ollama-llama-3.3-70b"), "gemini-2.0-pro");
  assert.equal(getEscalationTarget("gemini-2.0-flash"), "gemini-2.0-pro");
  assert.equal(getEscalationTarget("gpt-4o-mini"), "gpt-4.5");
  assert.equal(getEscalationTarget("o3-mini"), "o3");
  assert.equal(getEscalationTarget("claude-3.5-haiku"), "claude-code");
  assert.equal(getEscalationTarget("codex-cli"), "claude-code");
  assert.equal(getEscalationTarget("gemini-2.0-pro"), "claude-code");
  assert.equal(getEscalationTarget("gpt-4.5"), "claude-code");
  assert.equal(getEscalationTarget("o3"), "claude-code");
  assert.equal(getEscalationTarget("claude-code"), null);
});

test("getEscalationTarget returns null for unknown model", () => {
  assert.equal(getEscalationTarget("unknown-model"), null);
});
