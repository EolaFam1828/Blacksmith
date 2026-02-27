import { getLedgerDb } from "./tracker.js";

const buildWhereClause = (options) => {
  if (options.week) {
    return "WHERE created_at >= datetime('now', '-7 days')";
  }
  return "";
};

export const getSpendReport = async (options = {}) => {
  const db = await getLedgerDb();
  const whereClause = buildWhereClause(options);

  if (options.daily) {
    return db.prepare(`
      SELECT * FROM daily_summary
      ORDER BY date DESC
    `).all();
  }

  if (options.byBackend) {
    return db.prepare(`
      SELECT backend, ROUND(SUM(estimated_cost), 4) AS total_cost, COUNT(*) AS calls
      FROM ledger_entries
      ${whereClause}
      GROUP BY backend
      ORDER BY total_cost DESC, calls DESC
    `).all();
  }

  if (options.byWorkflow) {
    return db.prepare(`
      SELECT workflow, ROUND(SUM(estimated_cost), 4) AS total_cost, COUNT(*) AS calls
      FROM ledger_entries
      ${whereClause}
      GROUP BY workflow
      ORDER BY total_cost DESC, calls DESC
    `).all();
  }

  if (options.byDepartment) {
    return db.prepare(`
      SELECT department, ROUND(SUM(estimated_cost), 4) AS total_cost, COUNT(*) AS calls
      FROM ledger_entries
      ${whereClause}
      GROUP BY department
      ORDER BY total_cost DESC, calls DESC
    `).all();
  }

  return db.prepare(`
    SELECT
      ROUND(COALESCE(SUM(estimated_cost), 0), 4) AS total_cost,
      COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
      COUNT(*) AS calls
    FROM ledger_entries
    ${whereClause}
  `).get();
};
