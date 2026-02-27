/**
 * Blacksmith E2E Verification Utilities
 *
 * Parses CLI dry-run output (YAML) and validates against prompt expectations.
 * Also handles non-dry-run commands (brain, identity, mcr, config, etc.)
 * that produce YAML/text output.
 */

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

// ─── Output Parsing ─────────────────────────────────────────────

/**
 * Extract key-value pairs from YAML-ish CLI output.
 * Not a full YAML parser — just enough to validate dry-run fields.
 */
export const parseOutputFields = (output) => {
  const fields = {};
  const lines = output.split("\n");

  for (const line of lines) {
    const match = line.match(/^\s*(\w[\w._-]*):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (/^\d+(\.\d+)?$/.test(value)) value = Number(value);
      else if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);

      fields[key] = value;
    }
  }

  return fields;
};

// ─── Assertion Helpers ──────────────────────────────────────────

export const assertTier = (output, expected) => {
  assert.match(output, new RegExp(`tier: ${expected}`), `Expected tier: ${expected}`);
};

export const assertPassthrough = (output, expected) => {
  assert.match(
    output,
    new RegExp(`passthrough: ${expected}`),
    `Expected passthrough: ${expected}`
  );
};

export const assertBackend = (output, expected) => {
  assert.match(output, new RegExp(`backend: ${expected}`), `Expected backend: ${expected}`);
};

export const assertModel = (output, pattern) => {
  if (pattern instanceof RegExp) {
    assert.match(output, pattern, `Expected model matching ${pattern}`);
  } else {
    assert.match(output, new RegExp(`model: ${pattern}`), `Expected model: ${pattern}`);
  }
};

export const assertDepartment = (output, expected) => {
  assert.match(
    output,
    new RegExp(`department: ${expected}`),
    `Expected department: ${expected}`
  );
};

export const assertComplexity = (output, expected) => {
  if (expected instanceof RegExp) {
    const complexityMatch = output.match(/complexity:\s*(\w+)/);
    assert.ok(complexityMatch, "Expected complexity field in output");
    assert.match(complexityMatch[1], expected, `Expected complexity matching ${expected}`);
  } else {
    assert.match(
      output,
      new RegExp(`complexity: ${expected}`),
      `Expected complexity: ${expected}`
    );
  }
};

export const assertHasSpec = (output) => {
  assert.match(output, /spec:/, "Expected spec section in output");
};

export const assertNoSpec = (output) => {
  assert.doesNotMatch(output, /spec:/, "Expected no spec section in output");
};

export const assertHasBrain = (output) => {
  assert.match(output, /brain:/, "Expected brain section in output");
};

export const assertNoBrain = (output) => {
  assert.doesNotMatch(output, /\bbrain:/, "Expected no brain section in output");
};

export const assertHasMethodology = (output) => {
  assert.match(output, /methodology:/, "Expected methodology in output");
};

export const assertFormat = (output, expected) => {
  assert.match(output, new RegExp(`format: ${expected}`), `Expected format: ${expected}`);
};

export const assertHasReviewStandard = (output) => {
  assert.match(output, /Review standard/, "Expected Review standard in output");
};

export const assertHasSubAgents = (output) => {
  assert.match(output, /sub_agents/, "Expected sub_agents in output");
};

export const assertSubAgentCount = (output, count) => {
  assert.match(
    output,
    new RegExp(`sub_agents_needed: ${count}`),
    `Expected sub_agents_needed: ${count}`
  );
};

export const assertSubAgentNames = (output, names) => {
  for (const name of names) {
    assert.match(output, new RegExp(name), `Expected sub-agent: ${name}`);
  }
};

export const assertRequiresCheckpoint = (output) => {
  assert.match(output, /requires_checkpoint: true/, "Expected requires_checkpoint: true");
};

export const assertHasPipelineSteps = (output) => {
  assert.match(output, /pipeline_steps:/, "Expected pipeline_steps in output");
};

export const assertNoPipelineSteps = (output) => {
  assert.doesNotMatch(output, /pipeline_steps:/, "Expected no pipeline_steps");
};

export const assertPipelineStepNames = (output, names) => {
  for (const name of names) {
    assert.match(output, new RegExp(name), `Expected pipeline step: ${name}`);
  }
};

export const assertContextNeeded = (output, filePaths) => {
  for (const fp of filePaths) {
    assert.match(output, new RegExp(fp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `Expected context: ${fp}`);
  }
};

export const assertOutputContains = (output, patterns) => {
  for (const pattern of patterns) {
    assert.match(
      output,
      new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      `Expected output to contain: ${pattern}`
    );
  }
};

export const assertFileContains = async (homePath, relativePath, expected) => {
  const filePath = path.join(homePath, relativePath);
  const content = await fs.readFile(filePath, "utf8");
  assert.match(content, new RegExp(expected), `Expected ${relativePath} to contain: ${expected}`);
};

// ─── Composite Validator ────────────────────────────────────────

/**
 * Run all applicable assertions for a prompt's `expect` object against CLI output.
 *
 * @param {string} output  - Raw CLI stdout
 * @param {object} expect  - Assertion map from the prompt definition
 * @param {string} homePath - Temp BLACKSMITH_HOME for file checks
 */
export const validateExpectations = async (output, expect, homePath) => {
  if (expect.tier != null) assertTier(output, expect.tier);
  if (expect.passthrough != null) assertPassthrough(output, expect.passthrough);
  if (expect.backend != null) assertBackend(output, expect.backend);
  if (expect.model != null) assertModel(output, expect.model);
  if (expect.department != null) assertDepartment(output, expect.department);
  if (expect.complexity != null) assertComplexity(output, expect.complexity);

  if (expect.has_spec) assertHasSpec(output);
  if (expect.no_spec) assertNoSpec(output);
  if (expect.has_methodology) assertHasMethodology(output);
  if (expect.format) assertFormat(output, expect.format);
  if (expect.has_review_standard) assertHasReviewStandard(output);

  if (expect.no_brain) assertNoBrain(output);

  if (expect.has_sub_agents) assertHasSubAgents(output);
  if (expect.sub_agents_count != null) assertSubAgentCount(output, expect.sub_agents_count);
  if (expect.sub_agent_names) assertSubAgentNames(output, expect.sub_agent_names);

  if (expect.requires_checkpoint) assertRequiresCheckpoint(output);

  if (expect.has_pipeline_steps) assertHasPipelineSteps(output);
  if (expect.no_pipeline_steps) assertNoPipelineSteps(output);
  if (expect.pipeline_step_names) assertPipelineStepNames(output, expect.pipeline_step_names);

  if (expect.context_needed) assertContextNeeded(output, expect.context_needed);
  if (expect.output_contains) assertOutputContains(output, expect.output_contains);

  if (expect.file_check && homePath) {
    await assertFileContains(homePath, expect.file_check.path, expect.file_check.contains);
  }
};
