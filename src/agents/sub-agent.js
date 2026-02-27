const makeSubAgent = (name, department, model, prompt, kind) => ({
  name,
  department,
  model,
  prompt,
  kind
});

export const planSubAgents = ({ classification, task }) => {
  if (classification.task_type === "refactor") {
    return [
      makeSubAgent("Research current approach", "research", "gemini-2.5-pro", `Research best practices for: ${task}`, "research"),
      makeSubAgent("Analyze current code paths", "engineering", "ollama-deepseek-r1", `Analyze current code paths for: ${task}`, "analysis"),
      makeSubAgent("Generate refactor plan", "engineering", "claude-code", `Generate a step-by-step refactor plan for: ${task}`, "plan"),
      makeSubAgent("Generate tests", "engineering", "ollama-qwen2.5-coder", `Generate tests for: ${task}`, "tests"),
      makeSubAgent("Security review", "engineering", "gemini-2.5-pro", `Review the refactor plan for security risks: ${task}`, "review")
    ];
  }

  if (classification.task_type === "implementation" && classification.complexity === "high") {
    return [
      makeSubAgent("Plan implementation", "engineering", "claude-code", `Create an implementation plan for: ${task}`, "plan"),
      makeSubAgent("Generate tests", "engineering", "ollama-qwen2.5-coder", `Draft a test plan for: ${task}`, "tests")
    ];
  }

  return [];
};

export const summarizeSubAgentResults = (results) =>
  results.map((result) => `### ${result.name}\n- Model: ${result.model}\n- Outcome: ${result.text.slice(0, 400)}`).join("\n\n");
