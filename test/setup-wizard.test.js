import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { buildEnabledPatch } from "../src/utils/probe-backends.js";

test("buildEnabledPatch maps mixed results correctly", () => {
  const results = [
    { name: "ollama", available: true, detail: "3 model(s) loaded", models: ["a", "b", "c"] },
    { name: "claude", available: false, detail: "not found" },
    { name: "gemini", available: true, detail: "gemini found in PATH" },
  ];
  const patch = buildEnabledPatch(results);
  assert.deepEqual(patch, {
    ollama: { enabled: true },
    claude: { enabled: false },
    gemini: { enabled: true },
  });
});

test("buildEnabledPatch handles empty array", () => {
  assert.deepEqual(buildEnabledPatch([]), {});
});

test("buildEnabledPatch handles all available", () => {
  const results = [
    { name: "ollama", available: true, detail: "ok" },
    { name: "claude", available: true, detail: "ok" },
    { name: "codex", available: true, detail: "ok" },
  ];
  const patch = buildEnabledPatch(results);
  assert.ok(Object.values(patch).every((v) => v.enabled === true));
});

test("buildEnabledPatch handles all unavailable", () => {
  const results = [
    { name: "ollama", available: false, detail: "down" },
    { name: "claude", available: false, detail: "missing" },
  ];
  const patch = buildEnabledPatch(results);
  assert.ok(Object.values(patch).every((v) => v.enabled === false));
});

test("probeBackends returns all 5 backends", async () => {
  const { probeBackends } = await import("../src/utils/probe-backends.js");

  const mockFetch = mock.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ models: [{ name: "test-model" }] }) })
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    const results = await probeBackends({});
    assert.equal(results.length, 5);

    const names = results.map((r) => r.name);
    assert.deepEqual(names, ["ollama", "claude", "gemini", "codex", "github"]);

    for (const r of results) {
      assert.ok(typeof r.available === "boolean");
      assert.ok(typeof r.detail === "string");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("probeOllama returns available false when fetch throws", async () => {
  const { probeOllama } = await import("../src/utils/probe-backends.js");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("timeout"));

  try {
    const result = await probeOllama({});
    assert.equal(result.available, false);
    assert.equal(result.name, "ollama");
    assert.deepEqual(result.models, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("probeOllama returns models when fetch succeeds", async () => {
  const { probeOllama } = await import("../src/utils/probe-backends.js");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve({
      json: () => Promise.resolve({ models: [{ name: "llama3" }, { name: "qwen" }] }),
    });

  try {
    const result = await probeOllama({});
    assert.equal(result.available, true);
    assert.deepEqual(result.models, ["llama3", "qwen"]);
    assert.equal(result.detail, "2 model(s) loaded");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
