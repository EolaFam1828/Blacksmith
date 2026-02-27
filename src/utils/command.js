import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const runCommand = async (command, args, options = {}) => {
  const result = await execFileAsync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    maxBuffer: 1024 * 1024 * 10
  });

  return {
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || ""
  };
};

export const commandExists = async (command) => {
  try {
    await runCommand("which", [command]);
    return true;
  } catch {
    return false;
  }
};
