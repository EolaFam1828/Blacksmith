import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { appendTaskSummary } from "../brain/index.js";
import { routeTeardown } from "../brain/teardown-router.js";
import { getBlacksmithPath } from "../utils/paths.js";

const makeSessionPath = (sessionId) => getBlacksmithPath("sessions", `${sessionId}.json`);

const writeSession = async (sessionId, payload) => {
  await fs.writeFile(makeSessionPath(sessionId), JSON.stringify(payload, null, 2), "utf8");
};

export const scaffoldSession = async (metadata) => {
  const sessionId = crypto.randomUUID();
  const session = {
    id: sessionId,
    stage: "scaffold",
    created_at: new Date().toISOString(),
    metadata
  };
  await writeSession(sessionId, session);
  return session;
};

export const hydrateSession = async (sessionId, context) => {
  await writeSession(sessionId, {
    id: sessionId,
    stage: "hydrate",
    hydrated_at: new Date().toISOString(),
    context
  });
};

const extractListFromText = (heading, text) => {
  const lines = text.split("\n");
  const hits = [];
  let capture = false;
  for (const line of lines) {
    if (line.toLowerCase().includes(heading.toLowerCase())) {
      capture = true;
      continue;
    }
    if (capture && /^#+\s+/.test(line)) {
      break;
    }
    if (capture && /^[-*]\s+/.test(line.trim())) {
      hits.push(line.trim().replace(/^[-*]\s+/, ""));
    }
  }
  return hits.slice(0, 6);
};

export const compressExecution = ({ command, task, model, backend, result, classification, cost, project, escalated, subAgents = [] }) => {
  const outcome = result.text.trim();
  const decisions = extractListFromText("decision", outcome);
  const patterns = extractListFromText("pattern", outcome);
  const prerequisites = extractListFromText("prerequisite", outcome);
  const tags = [
    classification.department,
    classification.task_type,
    classification.complexity,
    ...(classification.context_needed || []).map((value) => path.basename(value))
  ].filter(Boolean);

  return {
    task: `${command}: ${task}`,
    command,
    model,
    backend,
    project,
    department: classification.department,
    outcome,
    decisions: decisions.length ? decisions : [`Completed ${command} workflow`],
    patterns: patterns.length ? patterns : [`Tier ${classification.tier} routing used`],
    prerequisites: prerequisites.length ? prerequisites : [],
    tags,
    escalated,
    cost
  };
};

export const storeSummary = async (summary) => {
  const notebooks = routeTeardown(summary);
  const markdown = [
    `## Task: ${summary.task}`,
    `**Date**: ${new Date().toISOString()}`,
    `**Model Used**: ${summary.model}`,
    `**Tokens**: ${summary.cost.prompt_tokens} in / ${summary.cost.completion_tokens} out ($${summary.cost.estimated_cost.toFixed(6)})`,
    `**Project**: ${summary.project || "blacksmith"} | **Dept**: ${summary.department}`,
    "",
    "### Decisions",
    ...summary.decisions.map((item) => `- ${item}`),
    "",
    "### Patterns Discovered",
    ...summary.patterns.map((item) => `- ${item}`),
    "",
    "### Prerequisites for Follow-up",
    ...(summary.prerequisites.length ? summary.prerequisites.map((item) => `- ${item}`) : ["- None recorded"]),
    "",
    "### Tags",
    summary.tags.join(", ")
  ].join("\n");

  await Promise.all(notebooks.map((name) => appendTaskSummary(name, markdown).catch(() => {})));
  return {
    notebooks,
    markdown
  };
};

export const teardownSession = async (sessionId, finalState) => {
  const sessionPath = makeSessionPath(sessionId);
  await fs.writeFile(
    sessionPath,
    JSON.stringify(
      {
        id: sessionId,
        stage: "teardown",
        completed_at: new Date().toISOString(),
        finalState
      },
      null,
      2
    ),
    "utf8"
  );
};
