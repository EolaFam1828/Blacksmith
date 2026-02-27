const routeTeardown = (taskSummary) => {
  const notebooks = new Set();
  const department = taskSummary.department || "engineering";
  notebooks.add(`history-${department}`);

  if (taskSummary.project) {
    notebooks.add(`project-${taskSummary.project}`);
  } else {
    notebooks.add("project-blacksmith");
  }

  const text = `${taskSummary.task || ""}\n${taskSummary.outcome || ""}\n${(taskSummary.tags || []).join(" ")}`.toLowerCase();

  if (taskSummary.error || /(error|exception|failed|stack|trace)/.test(text)) {
    notebooks.add("errors");
  }

  if (taskSummary.escalated || taskSummary.modelPerformanceNote) {
    notebooks.add("models");
  }

  return [...notebooks];
};

export { routeTeardown };
