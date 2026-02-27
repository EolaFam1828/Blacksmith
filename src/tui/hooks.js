import { React } from "./html.js";
import { loadConfig } from "../utils/config.js";
import { brainHealth } from "../brain/index.js";
import { getSpendReport } from "../ledger/reporter.js";
import { orchestrateTask } from "../orchestrator/index.js";

const { useState, useEffect, useCallback } = React;

export const useBlacksmithState = () => {
  const [state, setState] = useState({
    config: null,
    brain: null,
    spend: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [config, brain, spend] = await Promise.all([
          loadConfig().catch(() => null),
          brainHealth().catch(() => null),
          getSpendReport().catch(() => null),
        ]);

        if (!cancelled) {
          setState({ config, brain, spend, loading: false });
        }
      } catch {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
};

export const buildOrchestrateParams = (command, task) => ({
  command,
  task: task || (command === "commit" ? "Generate a commit message from the staged changes." : command),
  explicitBackend: undefined,
  explicitModel: undefined,
  filePaths: [],
  dryRun: false,
  force: false,
});

export const useTaskRunner = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const run = useCallback(async (command, task) => {
    setRunning(true);
    setError(null);

    try {
      const params = buildOrchestrateParams(command, task);
      const res = await orchestrateTask(params);

      setResult(res);
      setHistory((prev) => [...prev, { command, task, result: res, timestamp: Date.now() }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, []);

  return { run, result, running, error, history };
};
