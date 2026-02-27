import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_BRAIN_REGISTRY,
  DEFAULT_CONFIG,
  DEFAULT_INTENT,
  DEFAULT_INTENT_PROFILES,
  DEFAULT_MCR,
  DEFAULT_ORCHESTRATOR_PROMPT,
  NOTEBOOK_SEEDS
} from "../defaults.js";
import { BLACKSMITH_HOME } from "./paths.js";

const writeIfMissing = async (filePath, content) => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
};

export const ensureBlacksmithHome = async () => {
  const notebooksDir = path.join(BLACKSMITH_HOME, "notebooks");
  const sessionsDir = path.join(BLACKSMITH_HOME, "sessions");
  const logsDir = path.join(BLACKSMITH_HOME, "logs");
  const reportsDir = path.join(BLACKSMITH_HOME, "reports");
  const archivesDir = path.join(BLACKSMITH_HOME, "archives");
  const profilesDir = path.join(BLACKSMITH_HOME, "profiles");
  const vectorIndexDir = path.join(BLACKSMITH_HOME, "vector-index");

  await fs.mkdir(BLACKSMITH_HOME, { recursive: true });
  await fs.mkdir(notebooksDir, { recursive: true });
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.mkdir(archivesDir, { recursive: true });
  await fs.mkdir(profilesDir, { recursive: true });
  await fs.mkdir(vectorIndexDir, { recursive: true });

  await writeIfMissing(path.join(BLACKSMITH_HOME, "config.yaml"), DEFAULT_CONFIG);
  await writeIfMissing(path.join(BLACKSMITH_HOME, "mcr.yaml"), DEFAULT_MCR);
  await writeIfMissing(path.join(BLACKSMITH_HOME, "Intent.md"), DEFAULT_INTENT);
  await writeIfMissing(
    path.join(BLACKSMITH_HOME, "OrchestratorPrompt.md"),
    DEFAULT_ORCHESTRATOR_PROMPT
  );
  await writeIfMissing(path.join(BLACKSMITH_HOME, "brain.yaml"), DEFAULT_BRAIN_REGISTRY);

  await Promise.all(
    Object.entries(NOTEBOOK_SEEDS).map(([fileName, contents]) =>
      writeIfMissing(path.join(notebooksDir, fileName), contents)
    )
  );

  await Promise.all(
    Object.entries(DEFAULT_INTENT_PROFILES).map(([fileName, contents]) =>
      writeIfMissing(path.join(profilesDir, fileName), contents)
    )
  );
};
