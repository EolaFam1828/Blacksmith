const makeStep = (name, model, prompt, kind, opts = {}) => ({
  name,
  model,
  prompt,
  kind,
  department: opts.department || "engineering",
  destructive: opts.destructive || false,
  checkpoint: opts.checkpoint || false
});

export const generateStepsForCommand = (command, task, classification) => {
  switch (command) {
    case "refactor":
      return [
        makeStep("Research best practices", "gemini-2.5-pro", `Research best practices for: ${task}`, "research", { department: "research" }),
        makeStep("Analyze current code", "ollama-deepseek-r1", `Analyze current code paths for: ${task}`, "analysis"),
        makeStep("Generate refactor plan", "claude-code", `Generate a step-by-step refactor plan for: ${task}`, "plan"),
        makeStep("Checkpoint: review plan", "claude-code", `Confirm the refactor plan is safe for: ${task}`, "checkpoint", { checkpoint: true }),
        makeStep("Execute refactor", "claude-code", `Execute the refactor for: ${task}`, "execute", { destructive: true }),
        makeStep("Run tests", "ollama-qwen2.5-coder", `Generate and validate tests for: ${task}`, "tests"),
        makeStep("Final review", "gemini-2.5-pro", `Review the completed refactor for: ${task}`, "review")
      ];

    case "build":
      if (classification.complexity === "high") {
        return [
          makeStep("Plan implementation", "claude-code", `Create an implementation plan for: ${task}`, "plan"),
          makeStep("Checkpoint: review plan", "claude-code", `Confirm the implementation plan for: ${task}`, "checkpoint", { checkpoint: true }),
          makeStep("Execute build", "claude-code", `Execute the implementation for: ${task}`, "execute", { destructive: true }),
          makeStep("Generate tests", "ollama-qwen2.5-coder", `Draft a test plan for: ${task}`, "tests"),
          makeStep("Review", "gemini-2.5-pro", `Review the completed implementation for: ${task}`, "review")
        ];
      }
      return [];

    case "review":
      return [
        makeStep("Spec compliance check", "gemini-2.5-flash", `Check spec compliance for: ${task}. List deviations only.`, "spec_check", { department: "engineering" }),
        makeStep("Quality review", "gemini-2.5-pro", `Perform a thorough quality review for: ${task}`, "quality_review", { department: "engineering" })
      ];

    case "commit":
      return [
        makeStep("Generate diff summary", "ollama-qwen2.5-coder", `Summarize the staged diff for: ${task}`, "summary", { department: "operations" }),
        makeStep("Generate commit message", "ollama-qwen2.5-coder", `Generate a commit message for: ${task}`, "message", { department: "operations" }),
        makeStep("Checkpoint: confirm message", "ollama-qwen2.5-coder", `Confirm commit message for: ${task}`, "checkpoint", { checkpoint: true, department: "operations" })
      ];

    case "deploy":
      return [
        makeStep("Pre-deploy checks", "gemini-2.5-flash", `Run pre-deployment checks for: ${task}`, "checks", { department: "infrastructure" }),
        makeStep("Generate deploy plan", "claude-code", `Create deployment plan for: ${task}`, "plan", { department: "infrastructure" }),
        makeStep("Checkpoint: review plan", "claude-code", `Confirm deployment plan for: ${task}`, "checkpoint", { checkpoint: true, department: "infrastructure" }),
        makeStep("Execute deployment", "claude-code", `Execute deployment for: ${task}`, "execute", { destructive: true, department: "infrastructure" })
      ];

    default:
      return [];
  }
};

export const isMultiStepCommand = (command, classification) => {
  if (classification.complexity !== "high") return false;
  return ["refactor", "build", "deploy"].includes(command);
};
