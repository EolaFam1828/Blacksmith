import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cliPath = path.join(process.cwd(), "bin", "blacksmith.js");

const runCli = async (args, options = {}) => {
  const result = await execFileAsync("node", [cliPath, ...args], {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...options.env }
  });

  return result.stdout.trim();
};

const makeTempHome = async () => fs.mkdtemp(path.join(os.tmpdir(), "blacksmith-home-"));

test("brain init bootstraps the local home and seeds model notes", async () => {
  const tempHome = await makeTempHome();
  const output = await runCli(["brain", "init"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  const configPath = path.join(tempHome, "config.yaml");
  const intentPath = path.join(tempHome, "Intent.md");
  const modelsNotebook = path.join(tempHome, "notebooks", "models.md");

  await assert.doesNotReject(() => fs.access(configPath));
  await assert.doesNotReject(() => fs.access(intentPath));
  const seededModels = await fs.readFile(modelsNotebook, "utf8");

  assert.match(output, /provider: local/);
  assert.match(seededModels, /claude-code/);
});

test("tier 1 ask dry-run stays a bare passthrough", async () => {
  const tempHome = await makeTempHome();
  const output = await runCli(["ask", "what", "port", "does", "Redis", "use?", "--dry-run"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(output, /tier: 1/);
  assert.match(output, /passthrough: true/);
  assert.match(output, /backend: ollama/);
  assert.match(output, /model: ollama-qwen2.5-coder/);
  assert.doesNotMatch(output, /spec:/);
  assert.doesNotMatch(output, /brain:/);
});

test("tier 1 ask does not require valid identity data", async () => {
  const tempHome = await makeTempHome();
  await runCli(["brain", "init"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  await fs.writeFile(path.join(tempHome, "Intent.md"), "broken intent", "utf8");

  const output = await runCli(["ask", "hello", "--dry-run"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(output, /tier: 1/);
  assert.match(output, /passthrough: true/);
});

test("ask --deep upgrades to tier 2 orchestration", async () => {
  const tempHome = await makeTempHome();
  const output = await runCli(["ask", "hello", "--deep", "--dry-run"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(output, /tier: 2/);
  assert.match(output, /passthrough: false/);
  assert.match(output, /spec:/);
});

test("review dry-run inherits engineering identity data", async () => {
  const tempHome = await makeTempHome();
  const output = await runCli(["review", "src/orchestrator/index.js", "--dry-run"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(output, /department: engineering/);
  assert.match(output, /model: claude-code/);
  assert.match(output, /methodology:/);
  assert.match(output, /Review standard/);
});

test("research dry-run routes to research with Gemini Pro", async () => {
  const tempHome = await makeTempHome();
  const output = await runCli(["research", "Kubernetes vs Nomad", "--dry-run"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(output, /department: research/);
  assert.match(output, /model: gemini-2.5-pro/);
  assert.match(output, /format: research_report/);
});

test("identity command exposes parsed summary and departments", async () => {
  const tempHome = await makeTempHome();
  const summary = await runCli(["identity"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const departments = await runCli(["identity", "--departments"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const owner = await runCli(["identity", "--owner"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(summary, /mission:/);
  assert.match(summary, /departments:/);
  assert.match(departments, /engineering:/);
  assert.match(departments, /research:/);
  assert.match(owner, /name: Jake/);
});

test("identity profile commands list and apply templates", async () => {
  const tempHome = await makeTempHome();
  const listOutput = await runCli(["identity", "profile", "list"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  assert.match(listOutput, /coding\.md/);
  assert.match(listOutput, /campaign\.md/);

  await runCli(["identity", "profile", "apply", "coding", "--force"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const intent = await fs.readFile(path.join(tempHome, "Intent.md"), "utf8");
  assert.match(intent, /Coding Profile/);
});

test("refactor dry-run exposes sub-agent plan", async () => {
  const tempHome = await makeTempHome();
  const output = await runCli(
    ["refactor", "src/orchestrator/index.js", "--goal", "extract helpers", "--dry-run"],
    { env: { BLACKSMITH_HOME: tempHome } }
  );

  assert.match(output, /sub_agents:/);
  assert.match(output, /Research current approach/);
  assert.match(output, /Security review/);
});

test("brain maintenance and mcr maintenance commands work", async () => {
  const tempHome = await makeTempHome();
  const refreshOutput = await runCli(["brain", "refresh"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const mcrUpdateOutput = await runCli(["mcr", "update"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const mcrEditOutput = await runCli(["mcr", "edit"], {
    env: { BLACKSMITH_HOME: tempHome }
  });

  assert.match(refreshOutput, /last_refreshed:/);
  assert.match(mcrUpdateOutput, /Semi-automated update completed/);
  assert.match(mcrEditOutput, /mcr\.yaml/);
});

test("spend dashboard and routing report commands produce artifacts", async () => {
  const tempHome = await makeTempHome();
  const dashboardPath = await runCli(["spend", "--dashboard"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const dashboard = await fs.readFile(dashboardPath, "utf8");
  assert.match(dashboard, /Blacksmith Spend Dashboard/);
  assert.match(dashboard, /react/gi);

  const reportOutput = await runCli(["routing-report"], {
    env: { BLACKSMITH_HOME: tempHome }
  });
  const reportPath = path.join(tempHome, "reports", "routing-performance.md");
  const suggestionsPath = path.join(tempHome, "reports", "orchestrator-suggestions.md");
  await assert.doesNotReject(() => fs.access(reportPath));
  await assert.doesNotReject(() => fs.access(suggestionsPath));
  assert.match(reportOutput, /routing-performance\.md/);
});

test("map writes the current workspace tree into Intent.md", async () => {
  const tempHome = await makeTempHome();
  const tempRepo = await fs.mkdtemp(path.join(os.tmpdir(), "blacksmith-repo-"));
  await fs.writeFile(path.join(tempRepo, "README.md"), "# temp\n", "utf8");
  await fs.mkdir(path.join(tempRepo, "src"), { recursive: true });
  await fs.writeFile(path.join(tempRepo, "src", "index.js"), "export {};\n", "utf8");
  await fs.mkdir(path.join(tempRepo, "node_modules"), { recursive: true });
  await fs.writeFile(path.join(tempRepo, ".env"), "SECRET=1\n", "utf8");

  const output = await runCli(["map"], {
    cwd: tempRepo,
    env: { BLACKSMITH_HOME: tempHome }
  });

  const intent = await fs.readFile(path.join(tempHome, "Intent.md"), "utf8");
  assert.match(output, /README\.md/);
  assert.match(intent, /README\.md/);
  assert.match(intent, /src\//);
  assert.match(intent, /Auto-generated by `blacksmith map`/);
  assert.doesNotMatch(intent, /node_modules/);
  assert.doesNotMatch(intent, /\.env/);
});
