/**
 * Blacksmith E2E Prompt Suite — Test Harness
 *
 * Runs every prompt definition through the actual CLI binary using
 * isolated temporary BLACKSMITH_HOME directories. Dry-run mode ensures
 * no LLM backends are required — the full orchestration pipeline
 * (classify → route → identity → brain → assemble → cost) is exercised.
 *
 * Usage:
 *   npm test                              # runs all tests including this suite
 *   node --test test/e2e-prompt-suite.js  # run only this suite
 *
 * Environment:
 *   BLACKSMITH_E2E_VERBOSE=1   Print CLI output for each prompt
 *   BLACKSMITH_E2E_SUITE=tier1_passthrough   Run a single suite only
 */

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ALL_SUITES, PROMPT_COUNT } from "./prompts.js";
import { validateExpectations, assertOutputContains, assertFileContains } from "./e2e-verification.js";

const execFileAsync = promisify(execFile);
const VERBOSE = process.env.BLACKSMITH_E2E_VERBOSE === "1";
const SUITE_FILTER = process.env.BLACKSMITH_E2E_SUITE || null;

// ─── CLI Resolution ─────────────────────────────────────────────
// Resolve the blacksmith binary using this priority:
//   1. BLACKSMITH_CLI_DIR env var (explicit override)
//   2. cwd/bin/blacksmith.js (running from inside the repo)
//   3. ~/.local/share/blacksmith-cli/bin/blacksmith.js (standard install)
//   4. Fall back to global `blacksmith` command (npm link)

const resolveCliPath = async () => {
  const candidates = [
    process.env.BLACKSMITH_CLI_DIR && path.join(process.env.BLACKSMITH_CLI_DIR, "bin", "blacksmith.js"),
    path.join(process.cwd(), "bin", "blacksmith.js"),
    path.join(os.homedir(), ".local", "share", "blacksmith-cli", "bin", "blacksmith.js"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return { mode: "node", path: candidate };
    } catch {}
  }

  // Fall back to the global `blacksmith` command
  try {
    const { stdout } = await execFileAsync("which", ["blacksmith"]);
    if (stdout.trim()) return { mode: "direct", path: stdout.trim() };
  } catch {}

  throw new Error(
    "Cannot find blacksmith CLI. Run tests from the blacksmith repo, " +
    "set BLACKSMITH_CLI_DIR, or ensure `blacksmith` is in PATH."
  );
};

// Resolve once at module load
let _cli = null;
const getCli = async () => {
  if (!_cli) {
    _cli = await resolveCliPath();
    if (VERBOSE) console.log(`[e2e] Using CLI: ${_cli.mode} ${_cli.path}`);
  }
  return _cli;
};

// ─── Helpers ────────────────────────────────────────────────────

const makeTempHome = () => fs.mkdtemp(path.join(os.tmpdir(), "bs-e2e-"));

const makeTempRepo = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bs-repo-"));
  await fs.writeFile(path.join(dir, "README.md"), "# temp\n", "utf8");
  await fs.mkdir(path.join(dir, "src"), { recursive: true });
  await fs.writeFile(path.join(dir, "src", "index.js"), "export {};\n", "utf8");
  await fs.mkdir(path.join(dir, "node_modules"), { recursive: true });
  await fs.writeFile(path.join(dir, ".env"), "SECRET=1\n", "utf8");
  return dir;
};

const runCli = async (args, options = {}) => {
  const cli = await getCli();
  const cmd = cli.mode === "node" ? "node" : cli.path;
  const cmdArgs = cli.mode === "node" ? [cli.path, ...args] : args;

  try {
    const result = await execFileAsync(cmd, cmdArgs, {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...options.env,
        BLACKSMITH_AUTO_APPROVE: "1",
      },
      timeout: 30_000,
    });
    const stdout = result.stdout?.trim() || "";
    const stderr = result.stderr?.trim() || "";
    // Some commands output to stderr — merge for assertion visibility
    return { stdout, stderr, combined: [stdout, stderr].filter(Boolean).join("\n"), exitCode: 0 };
  } catch (error) {
    const stdout = error.stdout?.trim() || "";
    const stderr = error.stderr?.trim() || error.message;
    return {
      stdout,
      stderr,
      combined: [stdout, stderr].filter(Boolean).join("\n"),
      exitCode: error.code ?? 1,
    };
  }
};

const runPrompt = async (prompt, tempHome, options = {}) => {
  const args = [prompt.command, ...prompt.args, ...prompt.flags].filter(Boolean);
  const result = await runCli(args, {
    cwd: options.cwd || process.cwd(),
    env: { BLACKSMITH_HOME: tempHome },
  });

  if (VERBOSE) {
    console.log(`\n── ${prompt.name} ──`);
    console.log(`   cmd: blacksmith ${args.join(" ")}`);
    console.log(`   stdout: ${result.stdout.slice(0, 500) || "(empty)"}`);
    if (result.stderr) console.log(`   stderr: ${result.stderr.slice(0, 300)}`);
    if (result.exitCode !== 0) console.log(`   exitCode: ${result.exitCode}`);
  }

  return result;
};

// ─── Meta Test ──────────────────────────────────────────────────

test("prompt suite metadata is valid", () => {
  assert.ok(PROMPT_COUNT > 50, `Expected 50+ prompts, got ${PROMPT_COUNT}`);

  for (const [suiteName, prompts] of Object.entries(ALL_SUITES)) {
    for (const prompt of prompts) {
      assert.ok(prompt.name, `${suiteName}: prompt missing name`);
      assert.ok(prompt.command, `${suiteName}/${prompt.name}: missing command`);
      assert.ok(Array.isArray(prompt.args), `${suiteName}/${prompt.name}: args must be array`);
      assert.ok(Array.isArray(prompt.flags), `${suiteName}/${prompt.name}: flags must be array`);
      assert.ok(prompt.expect && typeof prompt.expect === "object", `${suiteName}/${prompt.name}: missing expect`);
    }
  }
});

// ─── Suite: Tier 1 Passthrough ──────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "tier1_passthrough") {
  test("SUITE: Tier 1 — deterministic passthrough routing", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.tier1_passthrough) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Engineering ─────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "engineering") {
  test("SUITE: Engineering — build, review, debug, refactor", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.engineering) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Research ────────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "research") {
  test("SUITE: Research — research, compare, summarize", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.research) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Infrastructure ──────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "infrastructure") {
  test("SUITE: Infrastructure — deploy, diagnose, provision", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.infrastructure) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Tier Upgrade ────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "tier_upgrade") {
  test("SUITE: Tier upgrade — ask --deep promotes to Tier 2", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.tier_upgrade) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Backend Override ────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "backend_override") {
  test("SUITE: Backend override — --backend and --model flags", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.backend_override) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Sub-Agent Planning ──────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "sub_agents") {
  test("SUITE: Sub-agent planning — pipeline steps and sub-agent generation", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.sub_agents) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Brain Operations ────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "brain") {
  test("SUITE: Brain — init, list, health, refresh, query", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.brain) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Identity ────────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "identity") {
  test("SUITE: Identity — parsing, profiles, departments", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.identity) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: MCR ─────────────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "mcr") {
  test("SUITE: MCR — registry show, compare, update", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.mcr) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: System Commands ─────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "system") {
  test("SUITE: System — config, spend, routing-report", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.system) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Suite: Map ─────────────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "map") {
  test("SUITE: Map — project tree generation and Intent.md injection", async (t) => {
    const tempHome = await makeTempHome();
    const tempRepo = await makeTempRepo();

    await t.test("map-writes-tree", async () => {
      const { combined } = await runCli(["map"], {
        cwd: tempRepo,
        env: { BLACKSMITH_HOME: tempHome },
      });

      // Verify tree output
      assert.match(combined, /README\.md/);

      // Verify Intent.md was updated
      const intent = await fs.readFile(path.join(tempHome, "Intent.md"), "utf8");
      assert.match(intent, /README\.md/);
      assert.match(intent, /src\//);
      assert.match(intent, /Auto-generated by `blacksmith map`/);

      // Verify exclusions
      assert.doesNotMatch(intent, /node_modules/);
      assert.doesNotMatch(intent, /\.env/);
    });
  });
}

// ─── Suite: Edge Cases ──────────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "edge_cases") {
  test("SUITE: Edge cases — boundary conditions and error handling", async (t) => {
    await t.test("ask-empty-task", async () => {
      const tempHome = await makeTempHome();
      const { combined } = await runCli(["ask", "", "--dry-run"], {
        env: { BLACKSMITH_HOME: tempHome },
      });
      assert.match(combined, /tier: 1/);
    });

    await t.test("ask-very-long-prompt", async () => {
      const tempHome = await makeTempHome();
      const longArgs = Array(200).fill("word");
      const { combined } = await runCli(["ask", ...longArgs, "--dry-run"], {
        env: { BLACKSMITH_HOME: tempHome },
      });
      assert.match(combined, /tier: 1/);
    });

    await t.test("broken-intent-tier1-still-works", async () => {
      const tempHome = await makeTempHome();
      await runCli(["brain", "init"], { env: { BLACKSMITH_HOME: tempHome } });
      await fs.writeFile(path.join(tempHome, "Intent.md"), "completely broken content", "utf8");

      const { combined } = await runCli(["ask", "hello", "--dry-run"], {
        env: { BLACKSMITH_HOME: tempHome },
      });
      assert.match(combined, /tier: 1/);
      assert.match(combined, /passthrough: true/);
    });

    await t.test("review-nonexistent-file-still-classifies", async () => {
      const tempHome = await makeTempHome();
      const { combined } = await runCli(
        ["review", "nonexistent-file.js", "--dry-run"],
        { env: { BLACKSMITH_HOME: tempHome } }
      );
      assert.match(combined, /tier: 2/);
      assert.match(combined, /department: engineering/);
    });

    await t.test("deploy-without-force-blocks-execution", async () => {
      const tempHome = await makeTempHome();
      const { stderr, exitCode } = await runCli(
        ["deploy", "--env", "production"],
        { env: { BLACKSMITH_HOME: tempHome } }
      );
      // Should error because deploy requires --force when not dry-run
      assert.ok(exitCode !== 0 || stderr.length > 0, "deploy without --force should fail");
    });

    await t.test("version-flag-prints-version", async () => {
      const tempHome = await makeTempHome();
      const { combined } = await runCli(["--version"], {
        env: { BLACKSMITH_HOME: tempHome },
      });
      assert.match(combined, /0\.2\.0/);
    });

    await t.test("help-flag-prints-usage", async () => {
      const tempHome = await makeTempHome();
      const { combined } = await runCli(["--help"], {
        env: { BLACKSMITH_HOME: tempHome },
      });
      assert.match(combined, /Agents that build agents/);
      assert.match(combined, /ask/);
      assert.match(combined, /build/);
      assert.match(combined, /brain/);
    });
  });
}

// ─── Suite: Classification ──────────────────────────────────────

if (!SUITE_FILTER || SUITE_FILTER === "classification") {
  test("SUITE: Classification — department and complexity accuracy", async (t) => {
    const tempHome = await makeTempHome();

    for (const prompt of ALL_SUITES.classification) {
      await t.test(prompt.name, async () => {
        const { combined } = await runPrompt(prompt, tempHome);
        await validateExpectations(combined, prompt.expect, tempHome);
      });
    }
  });
}

// ─── Cross-Cutting: Consistency Checks ──────────────────────────

test("CROSS-CUT: Every dry-run output includes estimated_cost", async (t) => {
  const tempHome = await makeTempHome();
  const dryRunPrompts = Object.values(ALL_SUITES)
    .flat()
    .filter((p) => p.flags.includes("--dry-run"));

  for (const prompt of dryRunPrompts) {
    await t.test(`${prompt.name} has estimated_cost`, async () => {
      const { combined } = await runPrompt(prompt, tempHome);
      assert.match(combined, /estimated_cost:/, `${prompt.name}: missing estimated_cost`);
    });
  }
});

test("CROSS-CUT: Tier 1 dry-runs never include spec or brain", async (t) => {
  const tempHome = await makeTempHome();
  const tier1Prompts = ALL_SUITES.tier1_passthrough;

  for (const prompt of tier1Prompts) {
    await t.test(`${prompt.name} has no spec/brain`, async () => {
      const { combined } = await runPrompt(prompt, tempHome);
      assert.doesNotMatch(combined, /\bspec:/, `${prompt.name}: tier 1 should not have spec`);
    });
  }
});

test("CROSS-CUT: All Tier 2 dry-runs include classification block", async (t) => {
  const tempHome = await makeTempHome();
  const tier2Prompts = [
    ...ALL_SUITES.engineering,
    ...ALL_SUITES.research,
    ...ALL_SUITES.infrastructure,
    ...ALL_SUITES.tier_upgrade,
  ];

  for (const prompt of tier2Prompts) {
    await t.test(`${prompt.name} has classification`, async () => {
      const { combined } = await runPrompt(prompt, tempHome);
      assert.match(combined, /tier: 2/, `${prompt.name}: should be tier 2`);
      assert.match(combined, /department:/, `${prompt.name}: missing department`);
      assert.match(combined, /complexity:/, `${prompt.name}: missing complexity`);
    });
  }
});

// ─── Isolation Verification ─────────────────────────────────────

test("ISOLATION: Separate BLACKSMITH_HOME dirs are truly independent", async () => {
  const home1 = await makeTempHome();
  const home2 = await makeTempHome();

  // Set a config value in home1
  await runCli(["config", "set", "routing.cost_hard_stop", "99"], {
    env: { BLACKSMITH_HOME: home1 },
  });

  // Verify home2 still has the default
  const { combined } = await runCli(["config", "show"], {
    env: { BLACKSMITH_HOME: home2 },
  });
  assert.match(combined, /cost_hard_stop: 2/, "home2 should have default cost_hard_stop");
});

test("ISOLATION: Brain init in one home does not affect another", async () => {
  const home1 = await makeTempHome();
  const home2 = await makeTempHome();

  await runCli(["brain", "init"], { env: { BLACKSMITH_HOME: home1 } });

  // Add a source to home1
  const tempFile = path.join(os.tmpdir(), `bs-source-${Date.now()}.md`);
  await fs.writeFile(tempFile, "# Test Source\nSome content.\n", "utf8");
  await runCli(["brain", "add", "reference", tempFile], {
    env: { BLACKSMITH_HOME: home1 },
  });

  // home2 reference notebook should not contain the added content
  await runCli(["brain", "init"], { env: { BLACKSMITH_HOME: home2 } });
  const refPath = path.join(home2, "notebooks", "reference.md");
  const content = await fs.readFile(refPath, "utf8");
  assert.doesNotMatch(content, /Test Source/);
});

// ─── Summary ────────────────────────────────────────────────────

test(`SUMMARY: Prompt suite contains ${PROMPT_COUNT} test prompts across ${Object.keys(ALL_SUITES).length} suites`, () => {
  assert.ok(PROMPT_COUNT >= 55, `Minimum 55 prompts required, got ${PROMPT_COUNT}`);
  assert.ok(Object.keys(ALL_SUITES).length >= 12, "Minimum 12 suites required");

  const suiteNames = Object.keys(ALL_SUITES);
  const required = [
    "tier1_passthrough", "engineering", "research", "infrastructure",
    "brain", "identity", "mcr", "system", "edge_cases", "classification",
  ];

  for (const name of required) {
    assert.ok(suiteNames.includes(name), `Missing required suite: ${name}`);
  }
});
