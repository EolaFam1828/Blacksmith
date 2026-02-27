import os from "node:os";
import path from "node:path";

export const BLACKSMITH_HOME =
  process.env.BLACKSMITH_HOME || path.join(os.homedir(), ".blacksmith");

export const resolveHomePath = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value === "~") {
    return os.homedir();
  }

  if (value === "~/.blacksmith") {
    return BLACKSMITH_HOME;
  }

  if (value.startsWith("~/.blacksmith/")) {
    return path.join(BLACKSMITH_HOME, value.slice("~/.blacksmith/".length));
  }

  if (value.startsWith("~/")) {
    return path.join(os.homedir(), value.slice(2));
  }

  return value;
};

export const toPortablePath = (value) =>
  value.replaceAll(BLACKSMITH_HOME, "~/.blacksmith").replaceAll(os.homedir(), "~");

export const getBlacksmithPath = (...segments) => path.join(BLACKSMITH_HOME, ...segments);
