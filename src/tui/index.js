import { html } from "./html.js";
import { render } from "ink";
import { App } from "./app.js";
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
