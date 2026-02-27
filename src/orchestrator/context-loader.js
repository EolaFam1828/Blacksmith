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
