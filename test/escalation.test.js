import assert from "node:assert/strict";
import test from "node:test";
import { shouldEscalate, getEscalationTarget, parseJudgeVerdict } from "../src/orchestrator/escalation.js";

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

// parseJudgeVerdict tests

test("parseJudgeVerdict parses well-formed INADEQUATE verdict", () => {
  const text = "VERDICT: INADEQUATE\nREASON: The response is too vague.\nCONFIDENCE: 0.85";
  const result = parseJudgeVerdict(text);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.reason, "The response is too vague.");
  assert.equal(result.confidence, 0.85);
});

test("parseJudgeVerdict parses well-formed ADEQUATE verdict", () => {
  const text = "VERDICT: ADEQUATE\nREASON: The response is thorough.\nCONFIDENCE: 0.9";
  const result = parseJudgeVerdict(text);
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.reason, "The response is thorough.");
  assert.equal(result.confidence, 0.9);
});

test("parseJudgeVerdict parses UNCERTAIN as non-escalation", () => {
  const text = "VERDICT: UNCERTAIN\nREASON: Hard to tell.\nCONFIDENCE: 0.4";
  const result = parseJudgeVerdict(text);
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.reason, "Hard to tell.");
});

test("parseJudgeVerdict returns safe default on null input", () => {
  const result = parseJudgeVerdict(null);
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.reason, "parse failure");
  assert.equal(result.confidence, 0);
});

test("parseJudgeVerdict returns safe default on empty string", () => {
  const result = parseJudgeVerdict("");
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.reason, "parse failure");
});

test("parseJudgeVerdict returns safe default on malformed input", () => {
  const result = parseJudgeVerdict("This is not a valid verdict at all");
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.reason, "parse failure");
  assert.equal(result.confidence, 0);
});

test("parseJudgeVerdict handles case-insensitive verdict", () => {
  const text = "verdict: inadequate\nreason: Bad answer.\nconfidence: 0.7";
  const result = parseJudgeVerdict(text);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.reason, "Bad answer.");
});

test("parseJudgeVerdict clamps confidence above 1 to 1", () => {
  const text = "VERDICT: ADEQUATE\nREASON: Fine.\nCONFIDENCE: 1.5";
  const result = parseJudgeVerdict(text);
  assert.equal(result.confidence, 1);
});

test("parseJudgeVerdict defaults confidence when unparseable", () => {
  const text = "VERDICT: ADEQUATE\nREASON: Fine.\nCONFIDENCE: -0.3";
  const result = parseJudgeVerdict(text);
  // Regex won't match negative, falls back to 0.5 default
  assert.equal(result.confidence, 0.5);
});

test("parseJudgeVerdict handles missing confidence", () => {
  const text = "VERDICT: ADEQUATE\nREASON: Looks good.";
  const result = parseJudgeVerdict(text);
  assert.equal(result.shouldEscalate, false);
  assert.equal(result.confidence, 0.5);
});

test("parseJudgeVerdict handles missing reason", () => {
  const text = "VERDICT: INADEQUATE\nCONFIDENCE: 0.8";
  const result = parseJudgeVerdict(text);
  assert.equal(result.shouldEscalate, true);
  assert.equal(result.reason, "no reason given");
});
