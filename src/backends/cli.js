import { spawn } from "node:child_process";
import { loadConfig } from "../utils/config.js";

const runSpawn = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
        return;
      }

      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });

    child.stdin.end(options.stdin || "");
  });

export const runClaudePrompt = async (prompt, options = {}) => {
  const config = await loadConfig();
  const args = [
    "--print",
    "--output-format",
    "text",
    "--permission-mode",
    options.permissionMode || "default",
    "--model",
    options.model || config.backends?.claude?.default_model || "sonnet"
  ];

  if (options.systemPrompt) {
    args.push("--append-system-prompt", options.systemPrompt);
  }

  args.push(prompt);
  const result = await runSpawn("claude", args, { cwd: options.cwd });
  return {
    text: result.stdout,
    model: options.model || config.backends?.claude?.default_model || "sonnet",
    usage: {
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: estimateTokens(result.stdout)
    }
  };
};

export const runGeminiPrompt = async (prompt, options = {}) => {
  const config = await loadConfig();
  const args = [
    "--prompt",
    prompt,
    "--output-format",
    "text",
    "--approval-mode",
    options.approvalMode || "default"
  ];

  if (options.model || config.backends?.gemini?.default_model) {
    args.push("--model", options.model || config.backends?.gemini?.default_model);
  }

  const result = await runSpawn("gemini", args, { cwd: options.cwd });
  return {
    text: result.stdout,
    model: options.model || config.backends?.gemini?.default_model || "gemini-2.5-pro",
    usage: {
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: estimateTokens(result.stdout)
    }
  };
};

export const runCodexPrompt = async (prompt, options = {}) => {
  const args = [
    "exec",
    "--skip-git-repo-check",
    "--sandbox",
    options.sandbox || "workspace-write",
    "--cd",
    options.cwd || process.cwd()
  ];

  if (options.model) {
    args.push("--model", options.model);
  }

  args.push(prompt);
  const result = await runSpawn("codex", args, { cwd: options.cwd });
  return {
    text: result.stdout,
    model: options.model || "codex-default",
    usage: {
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: estimateTokens(result.stdout)
    }
  };
};

export const runJulesPrompt = async (prompt, options = {}) => {
  const result = await runSpawn("gemini", ["--prompt", prompt, "--model", "jules"], {
    cwd: options.cwd
  });
  return {
    text: result.stdout,
    model: "jules",
    usage: {
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: estimateTokens(result.stdout)
    }
  };
};

const estimateTokens = (value) => Math.ceil((value || "").length / 4);
