import { html, React } from "./html.js";
import { render, useApp } from "ink";
import { App } from "./app.js";
import { SetupWizard } from "./setup-wizard.js";
import { ensureBlacksmithHome } from "../utils/bootstrap.js";

export const launchTui = async () => {
  await ensureBlacksmithHome();

  const { waitUntilExit } = render(html`<${App} />`);

  try {
    await waitUntilExit();
  } catch {
    // Graceful exit
  }
};

const SetupStandalone = () => {
  const { exit } = useApp();
  return html`<${SetupWizard} onComplete=${() => exit()} />`;
};

export const launchSetup = async () => {
  await ensureBlacksmithHome();

  const { waitUntilExit } = render(html`<${SetupStandalone} />`);

  try {
    await waitUntilExit();
  } catch {
    // Graceful exit
  }
};
