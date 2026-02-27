const makeStep = (name, model, prompt, kind, opts = {}) => ({
  name,
  model,
  prompt,
  kind,
  department: opts.department || "research",
  destructive: false,
  checkpoint: opts.checkpoint || false
});

export const generateResearchSteps = (task) => [
  makeStep("Scope research", "gemini-2.5-flash", `Define the scope and key questions for: ${task}`, "scope"),
  makeStep("Gather information", "gemini-2.5-pro", `Gather comprehensive information about: ${task}`, "gather"),
  makeStep("Synthesize findings", "gemini-2.5-pro", `Synthesize the gathered information into key findings for: ${task}`, "synthesize"),
  makeStep("Generate recommendations", "claude-code", `Based on the research, provide actionable recommendations for: ${task}`, "recommend")
];

export const generateCompareSteps = (task, options) => {
  const optionSteps = options.map((opt, i) =>
    makeStep(
      `Analyze option: ${opt}`,
      "gemini-2.5-flash",
      `Analyze "${opt}" as an option for: ${task}. List pros, cons, and key metrics.`,
      "option_analysis"
    )
  );

  return [
    ...optionSteps,
    makeStep(
      "Build comparison matrix",
      "gemini-2.5-pro",
      `Build a comparison matrix for all options analyzed. Task: ${task}`,
      "matrix"
    ),
    makeStep(
      "Final recommendation",
      "claude-code",
      `Based on the comparison matrix, provide a final recommendation for: ${task}`,
      "recommend"
    )
  ];
};

export const generateSummarizeSteps = (task) => [
  makeStep("Summarize content", "gemini-2.5-flash", `Produce a structured summary of: ${task}. Use bullet points and key takeaways.`, "summary")
];

export const getResearchWorkflow = (command, task, options = {}) => {
  switch (command) {
    case "research":
      return generateResearchSteps(task);
    case "compare":
      return generateCompareSteps(task, options.subjects || []);
    case "summarize":
      return generateSummarizeSteps(task);
    default:
      return [];
  }
};
