import { html, React } from "./html.js";
import { Box, Text, useApp, useInput } from "ink";
import { Header } from "./header.js";
import { StatusBar } from "./status-bar.js";
import { OutputArea } from "./output-area.js";
import { InputBar } from "./input-bar.js";
import { CommandPalette } from "./command-palette.js";
import { HelpOverlay } from "./help-overlay.js";
import { SetupWizard } from "./setup-wizard.js";
import { useBlacksmithState, useTaskRunner } from "./hooks.js";

const { useState, useEffect, useCallback } = React;

export const App = () => {
  const { exit } = useApp();
  const [mode, setMode] = useState("input");
  const [showSetup, setShowSetup] = useState(null);

  const { config, brain, spend, loading } = useBlacksmithState();
  const { run, running, history } = useTaskRunner();

  useEffect(() => {
    if (!loading && showSetup === null) {
      setShowSetup(!config?.setup_completed);
    }
  }, [loading, showSetup, config]);

  const handleSetupComplete = useCallback(() => {
    setShowSetup(false);
  }, []);

  const activeModel = config?.routing?.default_backend || "ollama";
  const totalCost = spend?.total_cost ?? 0;
  const notebookCount = brain?.notebooks?.length ?? 0;
  const sessionCount = history.length;

  const handleSubmit = useCallback((command, task) => {
    if (running) return;
    run(command, task);
  }, [run, running]);

  const handlePaletteSelect = useCallback((commandName) => {
    setMode("input");
    if (commandName === "setup") {
      setShowSetup(true);
      return;
    }
    if (!running) {
      run(commandName, "");
    }
  }, [run, running]);

  const openPalette = useCallback(() => setMode("palette"), []);
  const openHelp = useCallback(() => setMode("help"), []);

  useInput((input, key) => {
    if (mode === "palette" && key.escape) {
      setMode("input");
      return;
    }
    if (mode === "help" && (key.escape || input === "?")) {
      setMode("input");
      return;
    }
    if (mode === "input" && input === "q" && !running) {
      exit();
    }
  });

  if (loading) {
    return html`
      <${Box} flexDirection="column" padding=${1}>
        <${Text} color="cyan">Loading Blacksmith...<//>
      <//>
    `;
  }

  if (showSetup) {
    return html`<${SetupWizard} onComplete=${handleSetupComplete} />`;
  }

  return html`
    <${Box} flexDirection="column" minHeight=${20}>
      <${Header} model=${activeModel} spend=${totalCost} />

      ${mode === "palette" && html`
        <${CommandPalette}
          onSelect=${handlePaletteSelect}
          onClose=${() => setMode("input")}
        />
      `}

      ${mode === "help" && html`<${HelpOverlay} />`}

      <${OutputArea} history=${history} running=${running} />

      <${StatusBar}
        model=${activeModel}
        cost=${totalCost}
        brainNotebooks=${notebookCount}
        sessions=${sessionCount}
      />

      <${InputBar}
        onSubmit=${handleSubmit}
        onPalette=${openPalette}
        onHelp=${openHelp}
        disabled=${running}
      />
    <//>
  `;
};
