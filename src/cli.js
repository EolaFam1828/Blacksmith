import { Command } from "commander";
import {
  addNotebookSource,
  addProjectNotebook,
  archiveBrainNotebook,
  brainHealth,
  refreshBrain,
  initBrain,
  listNotebookSources,
  listNotebooks,
  queryBrain,
  queryNotebook
} from "./brain/index.js";
import { getDepartmentIdentity, getIdentity } from "./identity/index.js";
import { generateSpendDashboard } from "./ledger/dashboard.js";
import { getSpendReport } from "./ledger/reporter.js";
import { compareModels, getMcr, resolveModelId } from "./mcr/index.js";
import { analyzeRoutingPerformance, writeRoutingReports } from "./orchestrator/self-improvement.js";
import { getMcrEditTarget, updateMcr } from "./mcr/updater.js";
import { updateIntentProjectMap } from "./map.js";
import { formatDryRun, orchestrateTask } from "./orchestrator/index.js";
import { ensureBlacksmithHome } from "./utils/bootstrap.js";
import { getIntentPath, loadConfig, setConfigValue, saveIntent } from "./utils/config.js";
import { formatJson, formatYaml } from "./utils/format.js";
import { getBlacksmithPath } from "./utils/paths.js";

const print = (value) => {
  process.stdout.write(`${value}\n`);
};

const collectTask = (parts) => parts.join(" ").trim();

const renderTaskResult = (result) => {
  if (result.dry_run) {
    print(formatYaml(formatDryRun(result)));
    return;
  }

  print(result.result.text);
  print("");
  print(
    formatYaml({
      tier: result.classification.tier,
      passthrough: result.classification.passthrough,
      backend: result.backend,
      model: result.model,
      estimated_cost: result.cost.estimated_cost,
      department: result.classification.department,
      escalated: result.escalated || false,
      session: result.session || null,
      worktree: result.worktree?.path || null
    })
  );
};

const addCommonModelOptions = (command, options = {}) => {
  command.option("--backend <backend>");
  command.option("--model <model>");
  command.option("--dry-run");

  if (options.force) {
    command.option("--force");
  }

  return command;
};

const attachWorkflowCommand = (program, config) => {
  const command = addCommonModelOptions(
    program.command(config.name).description(config.description),
    { force: config.force !== false }
  )
    .argument(config.argumentSpec, config.argumentDescription);

  if (config.withFiles) {
    command.option("--file <path...>");
  }

  command.action(async (taskParts, options) => {
    const task = config.buildTask ? config.buildTask(taskParts, options) : collectTask(taskParts);
    const result = await orchestrateTask({
      command: config.name,
      task,
      explicitBackend: options.backend,
      explicitModel: options.model,
      filePaths: options.file || [],
      dryRun: Boolean(options.dryRun),
      force: Boolean(options.force)
    });
    renderTaskResult(result);
  });
};

export const buildProgram = () => {
  const program = new Command();
  program.name("blacksmith").description("Agents that build agents.").version("0.1.0");

  addCommonModelOptions(
    program.command("ask").description("Raw passthrough with deterministic routing"),
    { force: true }
  )
    .argument("<task...>")
    .option("--deep")
    .action(async (taskParts, options) => {
      const result = await orchestrateTask({
        command: "ask",
        task: collectTask(taskParts),
        explicitBackend: options.backend,
        explicitModel: options.model,
        deep: Boolean(options.deep),
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("build").description("Implementation workflow"),
    { force: true }
  )
    .argument("<task...>")
    .option("--file <path...>")
    .action(async (taskParts, options) => {
      const result = await orchestrateTask({
        command: "build",
        task: collectTask(taskParts),
        explicitBackend: options.backend,
        explicitModel: options.model,
        filePaths: options.file || [],
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  attachWorkflowCommand(program, {
    name: "research",
    description: "Research workflow",
    argumentSpec: "<task...>",
    argumentDescription: "Research question"
  });

  addCommonModelOptions(
    program.command("compare").description("Compare multiple options for a use case"),
    { force: true }
  )
    .argument("<subject...>")
    .requiredOption("--for <useCase>")
    .action(async (subjects, options) => {
      const task = `Compare ${subjects.join(", ")} for ${options.for}.`;
      const result = await orchestrateTask({
        command: "compare",
        task,
        explicitBackend: options.backend,
        explicitModel: options.model,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("summarize").description("Summarize a URL or local file"),
    { force: true }
  )
    .argument("<target>")
    .action(async (target, options) => {
      const isFile = !/^https?:\/\//.test(target);
      const result = await orchestrateTask({
        command: "summarize",
        task: `Summarize ${target}.`,
        explicitBackend: options.backend,
        explicitModel: options.model,
        filePaths: isFile ? [target] : [],
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("debug").description("Debugging workflow"),
    { force: true }
  )
    .argument("<task...>")
    .option("--file <path...>")
    .action(async (taskParts, options) => {
      const result = await orchestrateTask({
        command: "debug",
        task: collectTask(taskParts),
        explicitBackend: options.backend,
        explicitModel: options.model,
        filePaths: options.file || [],
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("refactor").description("Refactoring workflow"),
    { force: true }
  )
    .argument("<target>")
    .requiredOption("--goal <goal>")
    .action(async (target, options) => {
      const result = await orchestrateTask({
        command: "refactor",
        task: `Refactor ${target} with goal: ${options.goal}.`,
        explicitBackend: options.backend,
        explicitModel: options.model,
        filePaths: [target],
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("commit").description("Generate a commit message from staged changes"),
    { force: true }
  )
    .option("--conventional")
    .action(async (options) => {
      const style = options.conventional
        ? "Use conventional commit format."
        : "Use a concise commit message.";
      const result = await orchestrateTask({
        command: "commit",
        task: `Generate a commit message from the staged changes. ${style}`,
        explicitBackend: options.backend,
        explicitModel: options.model,
        reviewStaged: true,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force),
        conventionalCommit: Boolean(options.conventional)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("review").description("Code review workflow"),
    { force: true }
  )
    .argument("[target]")
    .option("--staged")
    .option("--pr <number>")
    .action(async (target, options) => {
      const filePaths = target ? [target] : [];
      const task = options.staged
        ? "Review the staged changes in this repository."
        : options.pr
          ? `Review PR #${options.pr}.`
          : target
            ? `Review ${target}.`
            : "Review the current repository.";
      const result = await orchestrateTask({
        command: "review",
        task,
        explicitBackend: options.backend,
        explicitModel: options.model,
        filePaths,
        reviewStaged: Boolean(options.staged),
        prNumber: options.pr || null,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("deploy").description("Deployment workflow"),
    { force: true }
  )
    .requiredOption("--env <environment>")
    .action(async (options) => {
      const result = await orchestrateTask({
        command: "deploy",
        task: `Prepare a deployment plan for environment: ${options.env}.`,
        explicitBackend: options.backend,
        explicitModel: options.model,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  addCommonModelOptions(
    program.command("diagnose").description("Infrastructure or runtime diagnosis"),
    { force: true }
  )
    .argument("[task...]")
    .option("--logs <source>")
    .action(async (taskParts, options) => {
      const detail = collectTask(taskParts || []);
      const task = options.logs
        ? `Diagnose using logs from ${options.logs}. ${detail}`.trim()
        : detail || "Diagnose the current issue.";
      const result = await orchestrateTask({
        command: "diagnose",
        task,
        explicitBackend: options.backend,
        explicitModel: options.model,
        dryRun: Boolean(options.dryRun),
        force: Boolean(options.force)
      });
      renderTaskResult(result);
    });

  attachWorkflowCommand(program, {
    name: "provision",
    description: "Provisioning workflow",
    argumentSpec: "<task...>",
    argumentDescription: "Provisioning request"
  });

  const brain = program.command("brain").description("Local brain operations");
  brain.argument("[query...]").action(async (queryParts) => {
    if (!queryParts?.length) {
      print("Use `blacksmith brain init`, `list`, `ask`, or pass a query.");
      return;
    }
    const result = await queryBrain(collectTask(queryParts));
    print(formatYaml(result));
  });

  brain.command("init").description("Initialize local notebook registry").action(async () => {
    const registry = await initBrain();
    print(formatYaml(registry));
  });

  brain.command("list").description("List notebooks").action(async () => {
    const notebooks = await listNotebooks();
    print(formatYaml(notebooks));
  });

  brain.command("sources").argument("<name>").description("List notebook sources").action(async (name) => {
    const sources = await listNotebookSources(name);
    print(formatYaml(sources));
  });

  brain
    .command("add")
    .argument("<name>")
    .argument("<source>")
    .description("Add a source file to a notebook")
    .action(async (name, source) => {
      const result = await addNotebookSource(name, source);
      print(formatYaml(result));
    });

  brain
    .command("ask")
    .argument("<name>")
    .argument("<query...>")
    .description("Query a specific notebook")
    .action(async (name, queryParts) => {
      const result = await queryNotebook(name, collectTask(queryParts));
      print(formatYaml(result));
    });

  brain
    .command("project")
    .description("Project notebook management")
    .command("add")
    .argument("<name>")
    .action(async (name) => {
      const result = await addProjectNotebook(name);
      print(formatYaml(result));
    });

  brain.command("health").description("Show notebook health").action(async () => {
    const result = await brainHealth();
    print(formatYaml(result));
  });

  brain.command("refresh").description("Refresh notebook-backed sources").action(async () => {
    const result = await refreshBrain();
    print(formatYaml(result));
  });

  brain.command("archive").argument("<name>").description("Archive a notebook").action(async (name) => {
    const result = await archiveBrainNotebook(name);
    print(formatYaml(result));
  });

  const identity = program.command("identity").description("Inspect the parsed Blacksmith identity");
  identity.option("--departments").option("--department <name>").option("--owner").action(async (options) => {
    const parsed = await getIdentity();

    if (options.owner) {
      print(formatYaml(parsed.owner));
      return;
    }

    if (options.department) {
      print(formatYaml((await getDepartmentIdentity(String(options.department).toLowerCase())) || {}));
      return;
    }

    if (options.departments) {
      print(formatYaml(parsed.departments));
      return;
    }

    print(
      formatYaml({
        mission: parsed.mission,
        vision: parsed.vision,
        owner: parsed.owner,
        departments: Object.keys(parsed.departments || {}),
        file_tree: parsed.file_tree,
        warnings: parsed.warnings
      })
    );
  });

  const profile = identity.command("profile").description("Manage alternative Intent profiles");
  profile.command("list").action(async () => {
    const profilesDir = getBlacksmithPath("profiles");
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(profilesDir);
    print(formatYaml(entries.sort()));
  });
  profile.command("apply").argument("<name>").option("--force").action(async (name, options) => {
    if (!options.force) {
      throw new Error("Applying an identity profile overwrites Intent.md. Re-run with --force.");
    }
    const { readFile } = await import("node:fs/promises");
    const profilePath = getBlacksmithPath("profiles", `${name}.md`);
    const contents = await readFile(profilePath, "utf8");
    await saveIntent(contents);
    print(getIntentPath());
  });

  const mcr = program.command("mcr").description("Model capability registry");
  mcr.command("show").option("--model <name>").action(async (options) => {
    const data = await getMcr();
    if (options.model) {
      print(formatYaml(data.models?.[resolveModelId(options.model)] || {}));
      return;
    }
    print(formatYaml(data));
  });

  mcr
    .command("compare")
    .argument("<left>")
    .argument("<right>")
    .requiredOption("--for <useCase>")
    .action(async (left, right, options) => {
      const comparison = await compareModels(left, right, options.for);
      print(formatYaml(comparison));
    });

  mcr.command("update").description("Semi-automated MCR refresh").action(async () => {
    const result = await updateMcr();
    print(formatYaml(result));
  });

  mcr.command("edit").description("Show the MCR file path for editing").action(async () => {
    const target = await getMcrEditTarget();
    print(target);
  });

  const config = program.command("config").description("Configuration");
  config.command("show").action(async () => {
    const current = await loadConfig();
    print(formatYaml(current));
  });

  config.command("set").argument("<key>").argument("<value>").action(async (key, value) => {
    const updated = await setConfigValue(key, value);
    print(formatYaml(updated));
  });

  program
    .command("spend")
    .description("Show spend data")
    .option("--week")
    .option("--by-backend")
    .option("--by-workflow")
    .option("--by-department")
    .option("--daily")
    .option("--dashboard")
    .action(async (options) => {
      if (options.dashboard) {
        const target = await generateSpendDashboard();
        print(target);
        return;
      }

      const report = await getSpendReport({
        week: Boolean(options.week),
        byBackend: Boolean(options.byBackend),
        byWorkflow: Boolean(options.byWorkflow),
        byDepartment: Boolean(options.byDepartment),
        daily: Boolean(options.daily)
      });
      print(Array.isArray(report) ? formatYaml(report) : formatJson(report));
    });

  program.command("map").description("Update the Intent project map from the current workspace").action(async () => {
    const tree = await updateIntentProjectMap(process.cwd());
    print(tree);
  });

  program.command("routing-report").description("Generate routing analysis and prompt suggestions").action(async () => {
    const analysis = await analyzeRoutingPerformance();
    const paths = await writeRoutingReports(analysis);
    print(formatYaml({ ...paths, suggestions: analysis.suggestions }));
  });

  return program;
};

export const runCli = async (argv = process.argv) => {
  await ensureBlacksmithHome();
  const program = buildProgram();
  await program.parseAsync(argv);
};
