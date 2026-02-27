import fs from "node:fs/promises";
import path from "node:path";
import { runCommand } from "../utils/command.js";

const safeRead = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
};

const estimateTokens = (text) => Math.ceil((text || "").length / 4);

const FIELD_PRIORITY = [
  "blame",
  "recentChanges",
  "prDiff",
  "stagedDiff",
  "packageJson",
  "files"
];

const estimateContextTokens = (ctx) => {
  let total = 0;
  for (const file of ctx.files || []) {
    total += estimateTokens(file.content);
  }
  total += estimateTokens(ctx.stagedDiff);
  total += estimateTokens(ctx.prDiff);
  total += estimateTokens(ctx.packageJson);
  total += estimateTokens(ctx.recentChanges);
  for (const val of Object.values(ctx.blame || {})) {
    total += estimateTokens(val);
  }
  return total;
};

const truncateFiles = (files, tokensToFree) => {
  if (!files || files.length === 0) return files;
  const result = [...files];
  let freed = 0;
  for (let i = result.length - 1; i >= 0 && freed < tokensToFree; i--) {
    const tokens = estimateTokens(result[i].content);
    if (tokens === 0) continue;
    const remainingToFree = tokensToFree - freed;
    if (tokens <= remainingToFree) {
      freed += tokens;
      result[i] = { ...result[i], content: null };
    } else {
      const charsToKeep = (tokens - remainingToFree) * 4;
      result[i] = { ...result[i], content: result[i].content.slice(0, charsToKeep) };
      freed = tokensToFree;
    }
  }
  return result;
};

export const truncateContext = (context, maxTokens) => {
  if (!maxTokens || maxTokens <= 0) return context;

  const totalTokens = estimateContextTokens(context);
  if (totalTokens <= maxTokens) return context;

  const truncated = { ...context };
  let current = totalTokens;

  for (const field of FIELD_PRIORITY) {
    if (current <= maxTokens) break;

    if (field === "files") {
      truncated.files = truncateFiles(truncated.files, current - maxTokens);
    } else if (field === "blame") {
      if (truncated.blame && Object.keys(truncated.blame).length > 0) {
        truncated.blame = {};
      }
    } else if (truncated[field]) {
      truncated[field] = null;
    }
    current = estimateContextTokens(truncated);
  }

  return truncated;
};

export { estimateTokens, estimateContextTokens };

export const loadContext = async ({ cwd, filePaths = [], reviewStaged = false, prNumber = null }) => {
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const absolute = path.resolve(cwd, filePath);
      return {
        path: filePath,
        absolute,
        content: await safeRead(absolute)
      };
    })
  );

  let stagedDiff = null;
  if (reviewStaged) {
    try {
      const result = await runCommand("git", ["diff", "--cached"], { cwd });
      stagedDiff = result.stdout;
    } catch {
      stagedDiff = null;
    }
  }

  let prDiff = null;
  if (prNumber) {
    try {
      const result = await runCommand("gh", ["pr", "diff", String(prNumber)], { cwd });
      prDiff = result.stdout;
    } catch {
      prDiff = null;
    }
  }

  const packageJson = await safeRead(path.join(cwd, "package.json"));
  let recentChanges = null;
  try {
    const result = await runCommand("git", ["log", "--oneline", "-5"], { cwd });
    recentChanges = result.stdout;
  } catch {
    recentChanges = null;
  }

  const blame = {};
  for (const filePath of filePaths) {
    try {
      const result = await runCommand("git", ["blame", "-L", "1,20", filePath], { cwd });
      blame[filePath] = result.stdout;
    } catch {
      blame[filePath] = null;
    }
  }

  return {
    cwd,
    files,
    stagedDiff,
    prDiff,
    packageJson,
    recentChanges,
    blame
  };
};
