const roleForTask = (taskType) => {
  switch (taskType) {
    case "code_review":
      return "Senior code reviewer";
    case "debugging":
      return "Senior debugging engineer";
    case "implementation":
      return "Senior implementation engineer";
    case "research":
    case "comparison":
    case "summarization":
      return "Senior research analyst";
    case "deployment":
    case "diagnosis":
    case "provisioning":
      return "Senior infrastructure engineer";
    case "refactor":
      return "Senior refactoring engineer";
    case "commit_message":
      return "Senior release operator";
    default:
      return "Senior technical assistant";
  }
};

export const assembleAgentSpec = ({
  identity,
  classification,
  context,
  brain,
  subAgents = [],
  task,
  backend,
  model,
  brainPrerequisites = []
}) => {
  const department = identity.departments?.[classification.department] || {};
  const focus = department.focus || classification.department;
  const methodology = department.methodology || [];
  const safety = [
    department.review_standard ? `Review standard: ${department.review_standard}` : null,
    department.output_standard ? `Output standard: ${department.output_standard}` : null,
    department.safety_standard ? `Safety standard: ${department.safety_standard}` : null,
    department.automation_level ? `Automation level: ${department.automation_level}` : null
  ].filter(Boolean);

  const outputFormat =
    classification.task_type === "code_review"
      ? "structured_review"
      : classification.department === "research"
        ? "research_report"
      : classification.task_type === "commit_message"
        ? "commit_message"
      : "implementation_notes";

  const brainExcerpts = (brain?.results || [])
    .flatMap((result) => result.excerpt.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 3))
    .slice(0, 6);
  const skills = [
    "file_read",
    context.stagedDiff || context.prDiff ? "git_diff" : null,
    context.files?.length ? "context_loader" : null,
    subAgents.length ? "sub_agent_dispatch" : null
  ].filter(Boolean);

  return {
    department: classification.department,
    methodology,
    constraints: [
      "Minimize context - only use relevant inputs",
      classification.department === "engineering" ? "Prioritize correctness before style" : null,
      classification.department === "research" ? "Cite concrete evidence from available context" : null
    ].filter(Boolean),
    soul: {
      identity: `${roleForTask(classification.task_type)} for Jake, focused on ${focus}`,
      values: identity.values,
      tone: identity.owner?.communication_style || "Direct, technical, no fluff",
      owner: {
        name: identity.owner?.name || "",
        role: identity.owner?.role || ""
      }
    },
    prerequisites: [
      `Department: ${classification.department}`,
      `Complexity: ${classification.complexity}`,
      ...(context.files || []).map((file) => `Loaded file: ${file.path}`),
      ...brainExcerpts,
      ...brainPrerequisites.map((p) => `[Brain] ${p}`),
      context.stagedDiff ? "Review staged git diff" : null,
      context.prDiff ? "Review pull request diff" : null
    ].filter(Boolean),
    context: {
      cwd: context.cwd,
      files: context.files?.map((file) => ({
        path: file.path,
        role: "primary context"
      })),
      has_package_json: Boolean(context.packageJson)
    },
    output: {
      format: outputFormat,
      sections:
        classification.task_type === "code_review"
          ? ["Findings", "Risks", "Recommendations"]
          : classification.department === "research"
            ? ["Findings", "Tradeoffs", "Recommendation"]
          : classification.task_type === "commit_message"
            ? ["Commit Message", "Rationale"]
          : ["Plan", "Changes", "Notes"]
    },
    skills,
    sub_agents: subAgents,
    safety,
    runtime: {
      backend,
      model,
      max_tokens: classification.complexity === "high" ? 6000 : classification.complexity === "medium" ? 3000 : 1200,
      temperature: classification.department === "research" ? 0.4 : 0.2,
      timeout: classification.complexity === "high" ? "90s" : "30s"
    },
    task
  };
};

export const renderAgentPrompt = ({ spec, context, task }) => {
  const sections = [
    `You are ${spec.soul.identity}.`,
    `Tone: ${spec.soul.tone}.`,
    `Owner context: ${spec.soul.owner.name} (${spec.soul.owner.role}).`,
    "",
    "Constraints:",
    ...spec.constraints.map((value) => `- ${value}`),
    "",
    "Values:",
    ...spec.soul.values.map((value) => `- ${value}`),
    "",
    "Task:",
    task,
    "",
    "Methodology:",
    ...(spec.methodology?.length ? spec.methodology.map((step) => `- ${step}`) : ["- Use pragmatic judgment."]),
    "",
    "Prerequisites:",
    ...spec.prerequisites.map((value) => `- ${value}`)
  ];

  if (spec.safety?.length) {
    sections.push("", "Safety:", ...spec.safety.map((value) => `- ${value}`));
  }

  if (spec.sub_agents?.length) {
    sections.push(
      "",
      "Sub-agents:",
      ...spec.sub_agents.map(
        (agent) => `- ${agent.name} (${agent.model}): ${agent.prompt}`
      )
    );
  }

  if (spec.skills?.length) {
    sections.push("", "Skills:", ...spec.skills.map((skill) => `- ${skill}`));
  }

  if (context.packageJson) {
    sections.push("", "package.json:", "```json", context.packageJson.trim(), "```");
  }

  for (const file of context.files || []) {
    if (!file.content) continue;
    sections.push("", `File: ${file.path}`, "```", file.content.trim(), "```");
  }

  if (context.stagedDiff) {
    sections.push("", "Staged diff:", "```diff", context.stagedDiff.trim(), "```");
  }

  if (context.prDiff) {
    sections.push("", "PR diff:", "```diff", context.prDiff.trim(), "```");
  }

  if (context.recentChanges) {
    sections.push("", "Recent git changes:", "```text", context.recentChanges.trim(), "```");
  }

  for (const [filePath, blame] of Object.entries(context.blame || {})) {
    if (!blame) continue;
    sections.push("", `Git blame for ${filePath}:`, "```text", blame.trim(), "```");
  }

  return sections.join("\n");
};
