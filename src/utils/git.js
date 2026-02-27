import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCommand } from "./command.js";

const sanitize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "task";

export const isGitRepository = async (cwd = process.cwd()) => {
  try {
    await runCommand("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return true;
  } catch {
    return false;
  }
};

export const getCurrentBranch = async (cwd = process.cwd()) => {
  const result = await runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd });
  return result.stdout;
};

export const getGitStatusSummary = async (cwd = process.cwd()) => {
  try {
    const result = await runCommand("git", ["status", "--short"], { cwd });
    return result.stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
};

export const createTaskWorktree = async ({ cwd = process.cwd(), task, sessionId }) => {
  if (!(await isGitRepository(cwd))) {
    return null;
  }

  const branch = `codex/blacksmith-${sanitize(task)}-${sessionId.slice(0, 8)}`;
  const worktreeBase = path.join(os.tmpdir(), "blacksmith-worktrees");
  const worktreePath = path.join(worktreeBase, branch.replaceAll("/", "-"));
  await fs.mkdir(worktreeBase, { recursive: true });
  await runCommand("git", ["worktree", "add", "-b", branch, worktreePath], { cwd });

  return {
    branch,
    path: worktreePath
  };
};

export const removeTaskWorktree = async ({ cwd = process.cwd(), worktreePath, branch }) => {
  if (!worktreePath || !branch) {
    return;
  }

  await runCommand("git", ["worktree", "remove", "--force", worktreePath], { cwd }).catch(() => {});
  await runCommand("git", ["branch", "-D", branch], { cwd }).catch(() => {});
};
