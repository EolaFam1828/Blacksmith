import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getBlacksmithPath } from "./paths.js";

const SESSIONS_DIR = getBlacksmithPath("sessions");

const sessionPath = (id) => path.join(SESSIONS_DIR, `${id}.json`);

const readSession = async (id) => {
  const raw = await fs.readFile(sessionPath(id), "utf8");
  return JSON.parse(raw);
};

const writeSessionFile = async (id, data) => {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
  await fs.writeFile(sessionPath(id), JSON.stringify(data, null, 2), "utf8");
};

export const createSession = async (command, task) => {
  const id = crypto.randomUUID();
  const session = {
    id,
    command,
    task,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {}
  };
  await writeSessionFile(id, session);
  return session;
};

export const getSession = async (id) => {
  try {
    return await readSession(id);
  } catch {
    return null;
  }
};

export const updateSession = async (id, data) => {
  const session = await readSession(id);
  session.data = { ...session.data, ...data };
  session.updated_at = new Date().toISOString();
  await writeSessionFile(id, session);
  return session;
};

export const closeSession = async (id) => {
  const session = await readSession(id);
  session.status = "closed";
  session.closed_at = new Date().toISOString();
  await writeSessionFile(id, session);
  return session;
};

export const cleanStaleSessions = async (maxAgeMs = 24 * 60 * 60 * 1000) => {
  let entries;
  try {
    entries = await fs.readdir(SESSIONS_DIR);
  } catch {
    return 0;
  }

  const now = Date.now();
  let cleaned = 0;

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(SESSIONS_DIR, entry);
    try {
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.unlink(filePath);
        cleaned++;
      }
    } catch {
      continue;
    }
  }

  return cleaned;
};
