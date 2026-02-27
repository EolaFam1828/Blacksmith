import { html, React } from "./html.js";
import { Box, Text } from "ink";

const costColor = (cost) => {
  if (cost > 2) return "red";
  if (cost >= 0.5) return "yellow";
  return "green";
};

export const StatusBar = ({ model, cost, brainNotebooks, sessions }) => {
  const costVal = Number(cost) || 0;
  const notebooks = brainNotebooks ?? 0;
  const sessionCount = sessions ?? 0;

  return html`
    <${Box} paddingX=${1} borderStyle="single" borderColor="gray">
      <${Text} dimColor>model: <//>
      <${Text} color="cyan">${model || "ollama"}<//>
      <${Text} dimColor>${" | cost: "}<//>
      <${Text} color=${costColor(costVal)}>$${costVal.toFixed(4)}<//>
      <${Text} dimColor>${" | brain: "}${notebooks} notebooks | sessions: ${sessionCount}<//>
    <//>
  `;
};
