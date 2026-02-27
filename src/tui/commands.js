export const commands = [
  { name: "ask", description: "Raw passthrough with deterministic routing", hasTaskArg: true, department: "general" },
  { name: "build", description: "Implementation workflow", hasTaskArg: true, department: "engineering" },
  { name: "research", description: "Research workflow", hasTaskArg: true, department: "research" },
  { name: "compare", description: "Compare options for a use case", hasTaskArg: true, department: "research" },
  { name: "summarize", description: "Summarize a URL or local file", hasTaskArg: true, department: "research" },
  { name: "debug", description: "Debugging workflow", hasTaskArg: true, department: "engineering" },
  { name: "refactor", description: "Refactoring workflow", hasTaskArg: true, department: "engineering" },
  { name: "review", description: "Code review workflow", hasTaskArg: true, department: "engineering" },
  { name: "commit", description: "Generate commit from staged changes", hasTaskArg: false, department: "operations" },
  { name: "deploy", description: "Deployment workflow", hasTaskArg: true, department: "infrastructure" },
  { name: "diagnose", description: "Infrastructure or runtime diagnosis", hasTaskArg: true, department: "infrastructure" },
  { name: "provision", description: "Provisioning workflow", hasTaskArg: true, department: "infrastructure" },
  { name: "brain", description: "Local brain operations", hasTaskArg: true, department: "system" },
  { name: "identity", description: "Inspect parsed identity", hasTaskArg: false, department: "system" },
  { name: "mcr", description: "Model capability registry", hasTaskArg: false, department: "system" },
  { name: "config", description: "Configuration management", hasTaskArg: false, department: "system" },
  { name: "spend", description: "Show spend data", hasTaskArg: false, department: "system" },
  { name: "map", description: "Update Intent project map", hasTaskArg: false, department: "system" },
];

const commandNames = new Set(commands.map((c) => c.name));

export const parseInput = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const first = parts[0].toLowerCase();

  if (commandNames.has(first)) {
    return { command: first, task: parts.slice(1).join(" ") };
  }

  return { command: "ask", task: trimmed };
};
