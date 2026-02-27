import { html, React } from "./html.js";
import { Box, Text } from "ink";

export const Header = ({ model, spend }) => {
  const costStr = spend != null ? `$${Number(spend).toFixed(4)}` : "$0.00";
  const modelStr = model || "ollama";

  return html`
    <${Box} flexDirection="row" justifyContent="space-between" paddingX=${1} borderStyle="single" borderColor="cyan">
      <${Text} bold color="cyan">BLACKSMITH v0.2.0<//>
      <${Text} dimColor>${modelStr} | today: ${costStr}<//>
    <//>
  `;
};
