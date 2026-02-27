import { html, React } from "./html.js";
import { Box, Text } from "ink";

const shortcuts = [
  ["/", "Open command palette"],
  ["?", "Toggle this help"],
  ["Enter", "Execute command"],
  ["Esc", "Close overlay"],
  ["q", "Quit Blacksmith"],
  ["Tab", "Cycle focus"],
];

export const HelpOverlay = () => html`
  <${Box} flexDirection="column" borderStyle="double" borderColor="yellow" paddingX=${2} paddingY=${1}>
    <${Text} bold color="yellow">Keyboard Shortcuts<//>
    <${Text}>${""}<//>
    ${shortcuts.map(([key, desc]) => html`
      <${Box} key=${key}>
        <${Text} bold color="cyan">${key.padEnd(8)}<//>
        <${Text}>${desc}<//>
      <//>
    `)}
    <${Text}>${""}<//>
    <${Text} dimColor>Press ? or Esc to close<//>
  <//>
`;
