import fs from "node:fs/promises";
import path from "node:path";
import { getLedgerDb } from "../ledger/tracker.js";
import { getBlacksmithPath } from "../utils/paths.js";

const REPORT_PATH = getBlacksmithPath("reports", "routing-performance.md");
const SUGGESTIONS_PATH = getBlacksmithPath("reports", "orchestrator-suggestions.md");

export const analyzeRoutingPerformance = async () => {
  const db = await getLedgerDb();
  const rows = db.prepare(`
    SELECT workflow, backend, model, COUNT(*) AS calls,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS successes,
           ROUND(AVG(duration_ms), 2) AS avg_duration_ms,
           ROUND(SUM(estimated_cost), 4) AS total_cost
    FROM ledger_entries
    GROUP BY workflow, backend, model
    ORDER BY calls DESC
  `).all();

  const totalCalls = db.prepare(`SELECT COUNT(*) AS count FROM ledger_entries`).get().count;
  const suggestions = [];
  for (const row of rows) {
    if (row.calls >= 3 && row.total_cost === 0 && !["raw_query", "commit_message"].includes(row.workflow)) {
      suggestions.push(`Consider promoting '${row.workflow}' on ${row.backend} to Tier 1 heuristics.`);
    }
    if (row.avg_duration_ms > 5000) {
      suggestions.push(`Workflow '${row.workflow}' on ${row.model} is slow; review escalation thresholds.`);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    totalCalls,
    rows,
    suggestions: [...new Set(suggestions)]
  };
};

export const writeRoutingReports = async (analysis) => {
  const markdown = [
    "# Routing Performance Summary",
    "",
    `Generated: ${analysis.generated_at}`,
    `Total calls: ${analysis.totalCalls}`,
    "",
    "## Workflows",
    ...analysis.rows.map(
      (row) =>
        `- ${row.workflow} via ${row.backend}/${row.model}: ${row.calls} calls, ${row.successes} successes, avg ${row.avg_duration_ms}ms, $${row.total_cost}`
    )
  ].join("\n");
  const suggestions = [
    "# Orchestrator Prompt Suggestions",
    "",
    ...analysis.suggestions.map((item) => `- ${item}`)
  ].join("\n");
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${markdown}\n`, "utf8");
  await fs.writeFile(SUGGESTIONS_PATH, `${suggestions}\n`, "utf8");
  return {
    report: REPORT_PATH,
    suggestions: SUGGESTIONS_PATH
  };
};

export const maybeGenerateRoutingReports = async () => {
  const db = await getLedgerDb();
  const totalCalls = db.prepare(`SELECT COUNT(*) AS count FROM ledger_entries`).get().count;
  if (totalCalls === 0 || totalCalls % 50 !== 0) {
    return null;
  }

  const analysis = await analyzeRoutingPerformance();
  const paths = await writeRoutingReports(analysis);
  return { analysis, ...paths };
};
