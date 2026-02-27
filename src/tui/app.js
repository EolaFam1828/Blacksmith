import { html, React } from "./html.js";
import { Box, Text, useApp, useInput } from "ink";
import { Header } from "./header.js";
import { StatusBar } from "./status-bar.js";
import { OutputArea } from "./output-area.js";
import { InputBar } from "./input-bar.js";
import { CommandPalette } from "./command-palette.js";
import { HelpOverlay } from "./help-overlay.js";
import { useBlacksmithState, useTaskRunner } from "./hooks.js";

const { useState, useCallback } = React;

export const App = () => {
  const { exit } = useApp();
  const [mode, setMode] = useState("input");

  const { config, brain, spend, loading } = useBlacksmithState();
  const { run, running, history } = useTaskRunner();

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
