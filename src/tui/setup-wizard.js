import { html, React } from "./html.js";
import { Box, Text, useInput } from "ink";
import { Spinner } from "@inkjs/ui";
import { probeBackends, buildEnabledPatch } from "../utils/probe-backends.js";
import { loadConfig, saveConfig } from "../utils/config.js";

const { useState, useEffect } = React;

const STEPS = { WELCOME: 0, PROBING: 1, RESULTS: 2, DONE: 3 };

export const SetupWizard = ({ onComplete }) => {
  const [step, setStep] = useState(STEPS.WELCOME);
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (step !== STEPS.PROBING) return;
    let cancelled = false;

    const run = async () => {
      const config = await loadConfig().catch(() => null);
      const probeResults = await probeBackends(config);
      if (!cancelled) {
        setResults(probeResults);
        setStep(STEPS.RESULTS);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [step]);

  useEffect(() => {
    if (step !== STEPS.DONE || saved) return;

    const save = async () => {
      const config = await loadConfig().catch(() => ({}));
      const patch = buildEnabledPatch(results);

      for (const [name, val] of Object.entries(patch)) {
        if (!config.backends) config.backends = {};
        if (!config.backends[name]) config.backends[name] = {};
        config.backends[name].enabled = val.enabled;
      }

      config.setup_completed = true;
      await saveConfig(config);
      setSaved(true);
    };

    save();
  }, [step, saved, results]);

  useInput((_input, key) => {
    if (key.return) {
      if (step === STEPS.WELCOME) setStep(STEPS.PROBING);
      else if (step === STEPS.RESULTS) setStep(STEPS.DONE);
      else if (step === STEPS.DONE && saved) onComplete();
    }
  });

  const readyCount = results.filter((r) => r.available).length;

  if (step === STEPS.WELCOME) {
    return html`
      <${Box} flexDirection="column" padding=${1}>
        <${Text} bold color="cyan">Blacksmith Setup Wizard<//>
        <${Text}> <//>
        <${Text}>This wizard will check which AI backends are available<//>
        <${Text}>on your system and auto-configure them.<//>
        <${Text}> <//>
        <${Text} dimColor>Press Enter to begin...<//>
      <//>
    `;
  }

  if (step === STEPS.PROBING) {
    return html`
      <${Box} flexDirection="column" padding=${1}>
        <${Text} bold color="cyan">Blacksmith Setup Wizard<//>
        <${Text}> <//>
        <${Spinner} label="Probing backends..." />
      <//>
    `;
  }

  if (step === STEPS.RESULTS) {
    return html`
      <${Box} flexDirection="column" padding=${1}>
        <${Text} bold color="cyan">Blacksmith Setup Wizard<//>
        <${Text}> <//>
        <${Text} bold>Backend Availability:<//>
        <${Text}> <//>
        ${results.map((r) => html`
          <${Box} key=${r.name}>
            <${Text} color=${r.available ? "green" : "red"}>${r.available ? "\u2714" : "\u2718"} <//>
            <${Text} bold>${r.name}<//>
            <${Text} dimColor>${"  " + r.detail}<//>
          <//>
        `)}
        <${Text}> <//>
        <${Text} dimColor>Press Enter to save and continue...<//>
      <//>
    `;
  }

  if (step === STEPS.DONE) {
    return html`
      <${Box} flexDirection="column" padding=${1}>
        <${Text} bold color="cyan">Blacksmith Setup Wizard<//>
        <${Text}> <//>
        <${Text} color="green">${readyCount} of ${results.length} backends ready.<//>
        ${saved && html`<${Text} dimColor>Configuration saved.<//>` }
        <${Text}> <//>
        ${saved && html`<${Text} dimColor>Press Enter to start Blacksmith...<//>` }
        ${!saved && html`<${Text} dimColor>Saving...<//>` }
      <//>
    `;
  }

  return null;
};
