import { queryBrain, queryBrainForPrerequisites } from "../brain/index.js";
import { hydrateSession, scaffoldSession, compressExecution, storeSummary, teardownSession } from "../agents/lifecycle.js";
import { runPrimaryAgent, runSubAgent } from "../agents/runner.js";
import { planSubAgents, summarizeSubAgentResults, runSubAgentPipeline } from "../agents/sub-agent.js";
import { getIdentity, pickDepartmentModel } from "../identity/index.js";
import { logLedgerEntry } from "../ledger/tracker.js";
import { maybeGenerateRoutingReports } from "./self-improvement.js";
import { backendForModel, resolveModelId } from "../mcr/index.js";
import { createTaskWorktree, removeTaskWorktree, isGitRepository } from "../utils/git.js";
import { loadConfig } from "../utils/config.js";
import { classifyTask } from "./classifier.js";
import { assembleAgentSpec, renderAgentPrompt } from "./agent-assembler.js";
import { loadContext } from "./context-loader.js";
import { estimateCost } from "./cost-estimator.js";
import { withSpinner } from "../utils/spinner.js";
import { shouldEscalate as checkEscalation, escalate } from "./escalation.js";
import { generateStepsForCommand, isMultiStepCommand } from "./workflows.js";
import { runBackend } from "../backends/index.js";
import { confirmAction } from "../utils/prompt.js";
import { createSession, getSession, updateSession, closeSession } from "../utils/session.js";

const resolveRuntimeModelName = ({ backend, model, config, explicitModel }) => {
  if (explicitModel && !explicitModel.startsWith("ollama-")) {
    return explicitModel;
  }

  if (backend === "ollama") {
    if (model === "ollama-deepseek-r1") {
      return config.backends?.ollama?.models?.reasoning || config.backends?.ollama?.default_model;
    }

    return config.backends?.ollama?.models?.code || config.backends?.ollama?.default_model;
  }

  if (backend === "claude") {
    return config.backends?.claude?.default_model || "sonnet";
  }

  if (backend === "gemini") {
    if (model === "gemini-2.0-flash") {
      return "gemini-2.0-flash";
    }

    return config.backends?.gemini?.default_model || "gemini-2.0-pro";
  }

  if (backend === "openai") {
    return explicitModel || model;
  }

  return explicitModel || undefined;
};

const getEscalationPath = (model) => {
  switch (model) {
    case "ollama-qwen2.5-coder":
      return "gemini-2.0-flash";
    case "ollama-deepseek-r1":
      return "o3-mini";
    case "ollama-llama-3.3-70b":
      return "gemini-2.0-pro";
    case "gemini-2.0-flash":
      return "gemini-2.0-pro";
    case "gpt-4o-mini":
      return "gpt-4.5";
    case "o3-mini":
      return "o3";
    case "claude-3.5-haiku":
      return "claude-code";
    case "codex-cli":
      return "claude-code";
    case "gemini-2.0-pro":
      return "claude-code";
    case "gpt-4.5":
      return "claude-code";
    case "o3":
      return "claude-code";
    default:
      return null;
  }
};

const shouldEscalate = ({ result, classification, config, explicitBackend, currentModel }) => {
  if (!config.routing?.auto_escalate || explicitBackend) {
    return false;
  }

  if (["claude-code", "jules-cli"].includes(currentModel)) {
    return false;
  }

  if (classification.complexity === "high" && result.text.trim().length < 600) {
    return true;
  }

  if (classification.complexity === "medium" && result.text.trim().length < 200) {
    return true;
  }

  return false;
};

const chooseFallbackModel = ({ command, classification, explicitBackend, explicitModel }) => {
  if (explicitModel) {
    return resolveModelId(explicitModel);
  }

  if (explicitBackend === "ollama") return "ollama-qwen2.5-coder";
  if (explicitBackend === "claude") return "claude-code";
  if (explicitBackend === "gemini") return "gemini-2.0-pro";
  if (explicitBackend === "openai") return "gpt-4.5";
  if (explicitBackend === "codex") return "codex-cli";
  if (explicitBackend === "jules") return "jules-cli";

  if (command === "review") {
    return "claude-code";
  }

  if (command === "debug") {
    return classification.complexity === "high" ? "claude-code" : "ollama-deepseek-r1";
  }

  if (command === "build" || command === "refactor") {
    return "claude-code";
  }

  if (["research", "compare"].includes(command)) {
    return "gemini-2.0-pro";
  }

  if (command === "summarize") {
    return "gemini-2.0-flash";
  }

  if (["deploy", "diagnose", "provision"].includes(command)) {
    return "claude-code";
  }

  if (command === "commit") {
    return "ollama-qwen2.5-coder";
  }

  return "ollama-qwen2.5-coder";
};

const renderSummary = ({ command, task, model, classification, result, cost, tier }) => {
  const lines = [
    `## Task: ${command}`,
    `**Date**: ${new Date().toISOString()}`,
    `**Model Used**: ${model}`,
    `**Estimated Cost**: $${cost.estimated_cost.toFixed(6)}`,
    `**Department**: ${classification.department}`,
    `**Tier**: ${tier}`,
    "",
    "### Task",
    task,
    "",
    "### Outcome",
    result.text.trim() || "_No text returned._"
  ];

  return lines.join("\n");
};

const buildTierOnePrompt = ({ command, task, context, conventionalCommit = false }) => {
  if (command === "commit") {
    const formatInstruction = conventionalCommit
      ? "Return a single conventional commit message."
      : "Return a single concise commit message.";
    const diff = context.stagedDiff?.trim() || "No staged diff was found.";
    return `${formatInstruction}\n\nStaged diff:\n\`\`\`diff\n${diff}\n\`\`\``;
  }

  return task;
};

const buildDryRunPayload = ({ classification, backend, model, cost, brain, spec, worktree, pipeline_steps }) => {
  const payload = {
    tier: classification.tier,
    passthrough: classification.passthrough,
    backend,
    model,
    estimated_cost: cost.estimated_cost,
    department: classification.department
  };

  if (classification.passthrough) {
    return payload;
  }

  return {
    ...payload,
    classification,
    brain: brain?.notebooks || [],
    spec,
    worktree,
    ...(pipeline_steps?.length ? { pipeline_steps } : {})
  };
};

const logExecution = async ({
  classification,
  command,
  backend,
  model,
  cost,
  durationMs,
  success,
  filePaths,
  metadata,
  promptTokens,
  completionTokens,
  escalated = false,
  sessionId = null,
  project = null
}) => {
  await logLedgerEntry({
    created_at: new Date().toISOString(),
    command,
    backend,
    model,
    workflow: classification.task_type,
    department: classification.department,
    prompt_tokens: promptTokens ?? cost.prompt_tokens,
    completion_tokens: completionTokens ?? cost.completion_tokens,
    estimated_cost: cost.estimated_cost,
    duration_ms: durationMs,
    success,
    escalated,
    session_id: sessionId,
    project,
    metadata: {
      tier: classification.tier,
      passthrough: classification.passthrough,
      file_paths: filePaths,
      ...metadata
    }
  });

  await maybeGenerateRoutingReports();
};

const enforceHumanCheckpoint = ({ command, force, dryRun }) => {
  const protectedCommands = new Set(["deploy", "provision"]);
  if (protectedCommands.has(command) && !force && !dryRun) {
    throw new Error(`'${command}' requires confirmation. Re-run with --force.`);
  }
};

const runTierOne = async ({
  classification,
  command,
  task,
  cwd,
  filePaths,
  explicitBackend,
  explicitModel,
  config,
  reviewStaged,
  dryRun,
  force,
  conventionalCommit
}) => {
  const model = chooseFallbackModel({
    command,
    classification,
    explicitBackend,
    explicitModel
  });
  const backend = explicitBackend || backendForModel(model);
  const runtimeModelName = resolveRuntimeModelName({
    backend,
    model,
    config,
    explicitModel
  });
  const context =
    command === "commit"
      ? await loadContext({ cwd, filePaths, reviewStaged: true })
      : { stagedDiff: null };
  const prompt = buildTierOnePrompt({
    command,
    task,
    context,
    conventionalCommit
  });
  const cost = await estimateCost(model, prompt, classification);

  if (cost.estimated_cost > (config.routing?.cost_hard_stop ?? 2) && !dryRun && !force) {
    throw new Error(
      `Estimated cost $${cost.estimated_cost.toFixed(4)} exceeds configured hard stop. Re-run with --force to continue.`
    );
  }

  if (dryRun) {
    return {
      dry_run: true,
      classification,
      backend,
      model,
      cost,
      passthrough_prompt: prompt
    };
  }

  const start = Date.now();
  let result;
  let success = false;

  try {
    result = await withSpinner(`Running ${model}`, () =>
      runBackend({
        backend,
        model,
        prompt,
        options: {
          cwd,
          modelName: runtimeModelName
        }
      })
    );
    success = true;
  } finally {
    await logExecution({
      classification,
      command,
      backend,
      model,
      cost,
      durationMs: Date.now() - start,
      success,
      filePaths,
      metadata: { route_reason: classification.route_reason },
      promptTokens: result?.usage?.prompt_tokens,
      completionTokens: result?.usage?.completion_tokens
    });
  }

  return {
    classification,
    backend,
    model,
    cost,
    result
  };
};

const runTierTwo = async ({
  classification,
  command,
  task,
  cwd,
  filePaths,
  explicitBackend,
  explicitModel,
  config,
  reviewStaged,
  prNumber,
  dryRun,
  force
}) => {
  enforceHumanCheckpoint({ command, force, dryRun });
  const identity = await getIdentity();
  const brain = await queryBrain(task);
  const brainPrereqs = await queryBrainForPrerequisites(task, classification).catch(() => []);
  const subAgents = planSubAgents({ classification, task });
  const useMultiStep = isMultiStepCommand(command, classification);
  const pipelineSteps = useMultiStep ? generateStepsForCommand(command, task, classification) : [];
  const model =
    explicitModel ||
    pickDepartmentModel(identity, classification) ||
    chooseFallbackModel({ command, classification, explicitBackend, explicitModel });
  const resolvedModel = resolveModelId(model);
  const backend = explicitBackend || backendForModel(resolvedModel);
  let worktree = null;
  let executionCwd = cwd;
  let context = await loadContext({ cwd: executionCwd, filePaths, reviewStaged, prNumber });
  const spec = assembleAgentSpec({
    identity,
    classification,
    context,
    brain,
    subAgents,
    task,
    backend,
    model: resolvedModel,
    brainPrerequisites: brainPrereqs
  });
  let prompt = renderAgentPrompt({ spec, context, task });
  const cost = await estimateCost(resolvedModel, prompt, classification);
  const runtimeModelName = resolveRuntimeModelName({
    backend,
    model: resolvedModel,
    config,
    explicitModel
  });

  if (cost.estimated_cost > (config.routing?.cost_hard_stop ?? 2) && !dryRun && !force) {
    throw new Error(
      `Estimated cost $${cost.estimated_cost.toFixed(4)} exceeds configured hard stop. Re-run with --force to continue.`
    );
  }

  if (dryRun) {
    return {
      dry_run: true,
      classification,
      brain,
      backend,
      model: resolvedModel,
      cost,
      spec,
      worktree,
      pipeline_steps: pipelineSteps.map((s) => s.name)
    };
  }

  const session = await scaffoldSession({
    command,
    task,
    cwd: executionCwd,
    backend,
    model: resolvedModel
  });
  const managedSession = await createSession(command, task).catch(() => null);

  if (["refactor", "build"].includes(command) && classification.complexity === "high" && (await isGitRepository(cwd))) {
    worktree = await createTaskWorktree({ cwd, task, sessionId: session.id });
    executionCwd = worktree?.path || cwd;
  }
  if (executionCwd !== cwd) {
    context = await loadContext({ cwd: executionCwd, filePaths, reviewStaged, prNumber });
    await hydrateSession(session.id, context);
    spec.context.cwd = executionCwd;
    prompt = renderAgentPrompt({ spec, context, task });
  } else {
    await hydrateSession(session.id, context);
  }

  const start = Date.now();
  let result;
  let success = false;
  let escalated = false;
  let currentModel = resolvedModel;
  let currentBackend = backend;
  let subAgentResults = [];

  try {
    if (useMultiStep && pipelineSteps.length > 0) {
      subAgentResults = await runSubAgentPipeline(session, pipelineSteps, config);
      const synthesized = summarizeSubAgentResults(subAgentResults);
      result = await withSpinner(`Synthesizing with ${currentModel}`, () =>
        runPrimaryAgent({
          backend: currentBackend,
          model: currentModel,
          prompt: `${prompt}\n\nPipeline results:\n${synthesized}\n\nSynthesize a final response.`,
          options: { cwd: executionCwd, modelName: runtimeModelName }
        })
      );
    } else {
      if (subAgents.length > 0) {
        subAgentResults = [];
        for (const subAgent of subAgents) {
          const subModel = resolveModelId(subAgent.model);
          const subBackend = backendForModel(subModel);
          const subResult = await withSpinner(`Sub-agent: ${subAgent.name}`, () =>
            runSubAgent({
              backend: subBackend,
              model: subModel,
              prompt: subAgent.prompt,
              options: {
                cwd: executionCwd,
                modelName: resolveRuntimeModelName({
                  backend: subBackend,
                  model: subModel,
                  config,
                  explicitModel: null
                })
              },
              name: subAgent.name,
              kind: subAgent.kind
            })
          ).catch((error) => ({
            name: subAgent.name,
            kind: subAgent.kind,
            model: subModel,
            text: `Sub-agent failed: ${error.message}`,
            usage: { prompt_tokens: 0, completion_tokens: 0 }
          }));
          subAgentResults.push(subResult);
        }
        prompt = `${prompt}\n\nSub-agent results:\n${summarizeSubAgentResults(subAgentResults)}`;
      }

      if (command === "review" && identity.departments?.engineering?.review_standard) {
        const stageOne = await withSpinner("Stage 1: spec compliance", () =>
          runPrimaryAgent({
            backend: "gemini",
            model: "gemini-2.0-flash",
            prompt: `${prompt}\n\nStage 1: Check spec compliance and list deviations only.`,
            options: { cwd: executionCwd, modelName: "gemini-2.0-flash" }
          })
        ).catch(() => null);
        if (stageOne?.text) {
          prompt = `${prompt}\n\nStage 1 review findings:\n${stageOne.text}`;
        }
      }

      result = await withSpinner(`Running ${currentModel}`, () =>
        runPrimaryAgent({
          backend: currentBackend,
          model: currentModel,
          prompt,
          options: { cwd: executionCwd, modelName: runtimeModelName }
        })
      );
    }

    if (shouldEscalate({ result, classification, config, explicitBackend, currentModel })) {
      const escalatedModel = getEscalationPath(currentModel);
      if (escalatedModel) {
        const escalatedBackend = backendForModel(escalatedModel);
        const escalatedResult = await withSpinner(`Escalating to ${escalatedModel}`, () =>
          runPrimaryAgent({
            backend: escalatedBackend,
            model: escalatedModel,
            prompt: `${prompt}\n\nPrevious attempt was insufficient. Return a stronger answer.`,
            options: {
              cwd: executionCwd,
              modelName: resolveRuntimeModelName({
                backend: escalatedBackend,
                model: escalatedModel,
                config,
                explicitModel: null
              })
            }
          })
        );
        result = {
          ...escalatedResult,
          text: `${escalatedResult.text}\n\n[Escalated from ${currentModel} to ${escalatedModel}]`
        };
        currentModel = escalatedModel;
        currentBackend = escalatedBackend;
        escalated = true;
      }
    }
    success = true;
  } finally {
    await logExecution({
      classification,
      command,
      backend: currentBackend,
      model: currentModel,
      cost,
      durationMs: Date.now() - start,
      success,
      filePaths,
      metadata: {
        brain_notebooks: brain.notebooks,
        route_reason: classification.route_reason,
        sub_agents: subAgents.map((agent) => agent.name),
        pipeline_steps: pipelineSteps.map((s) => s.name),
        worktree,
        branch: worktree?.branch
      },
      promptTokens: result?.usage?.prompt_tokens,
      completionTokens: result?.usage?.completion_tokens,
      escalated,
      sessionId: session.id,
      project: extractProjectName(cwd)
    });

    if (managedSession) {
      await updateSession(managedSession.id, { success, escalated, model: currentModel }).catch(() => {});
    }

    if (worktree && success) {
      const keepWorktree = await confirmAction(`Keep worktree at ${worktree.path}? (merge manually)`).catch(() => false);
      if (!keepWorktree) {
        await removeTaskWorktree({ cwd, worktreePath: worktree.path, branch: worktree.branch });
        worktree = { ...worktree, removed: true };
      }
    }
  }

  const compact = compressExecution({
    command,
    task,
    model: currentModel,
    backend: currentBackend,
    result,
    classification,
    cost,
    project: extractProjectName(cwd),
    escalated,
    subAgents: subAgentResults
  });
  const storage = await storeSummary(compact);
  await teardownSession(session.id, {
    notebooks: storage.notebooks,
    escalated,
    model: currentModel
  });

  if (managedSession) {
    await closeSession(managedSession.id).catch(() => {});
  }

  return {
    classification,
    brain,
    backend: currentBackend,
    model: currentModel,
    cost,
    spec,
    session: session.id,
    worktree,
    escalated,
    sub_agents: subAgentResults,
    result
  };
};

export const orchestrateTask = async ({
  command,
  task,
  cwd = process.cwd(),
  filePaths = [],
  explicitBackend,
  explicitModel,
  reviewStaged = false,
  prNumber = null,
  deep = false,
  dryRun = false,
  force = false,
  conventionalCommit = false
}) => {
  const config = await loadConfig();
  const classification = classifyTask({
    command,
    prompt: task,
    filePaths,
    deep
  });

  if (classification.tier === 1) {
    return runTierOne({
      classification,
      command,
      task,
      cwd,
      filePaths,
      explicitBackend,
      explicitModel,
      config,
      reviewStaged,
      dryRun,
      force,
      conventionalCommit
    });
  }

  return runTierTwo({
    classification,
    command,
    task,
    cwd,
    filePaths,
    explicitBackend,
    explicitModel,
    config,
    reviewStaged,
    prNumber,
    dryRun,
    force
  });
};

export const formatDryRun = buildDryRunPayload;

const extractProjectName = (cwd) => cwd.split("/").filter(Boolean).at(-1) || "blacksmith";
