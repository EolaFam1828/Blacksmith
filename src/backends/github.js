import { commandExists, runCommand } from "../utils/command.js";

export const runGithubOperation = async (prompt, options = {}) => {
  const hasGh = await commandExists("gh");
  if (!hasGh) {
    throw new Error("GitHub CLI (`gh`) is not installed in this environment.");
  }

  if (options.mode === "pr-diff" && options.prNumber) {
    const result = await runCommand("gh", ["pr", "diff", String(options.prNumber)], {
      cwd: options.cwd
    });
    return {
      text: result.stdout,
      model: "gh",
      usage: {
        prompt_tokens: Math.ceil(prompt.length / 4),
        completion_tokens: Math.ceil(result.stdout.length / 4)
      }
    };
  }

  if (options.mode === "pr-view" && options.prNumber) {
    const result = await runCommand(
      "gh",
      ["pr", "view", String(options.prNumber), "--json", "title,body,headRefName,baseRefName,author"],
      { cwd: options.cwd }
    );
    return {
      text: result.stdout,
      model: "gh",
      usage: {
        prompt_tokens: Math.ceil(prompt.length / 4),
        completion_tokens: Math.ceil(result.stdout.length / 4)
      }
    };
  }

  const result = await runCommand("gh", ["help"], { cwd: options.cwd });
  return {
    text: result.stdout,
    model: "gh",
    usage: {
      prompt_tokens: Math.ceil(prompt.length / 4),
      completion_tokens: Math.ceil(result.stdout.length / 4)
    }
  };
};
