import { html, React } from "./html.js";
import { Box, Text } from "ink";

const { useState } = React;

const ResultEntry = ({ entry }) => {
  const { command, task, result } = entry;
  const text = result?.result?.text || result?.error || "(no output)";
  const meta = result?.classification
    ? `tier:${result.classification.tier}  backend:${result.backend}  model:${result.model}  cost:$${(result.cost?.estimated_cost || 0).toFixed(6)}`
    : "";

  return html`
    <${Box} flexDirection="column" marginBottom=${1}>
      <${Text} color="cyan" bold>${"> "}${command}${task ? ` ${task}` : ""}<//>
      <${Text} wrap="wrap">${text}<//>
      ${meta && html`<${Text} dimColor>${meta}<//>`}
    <//>
  `;
};

export const OutputArea = ({ history, running }) => {
  const visibleHistory = history.slice(-20);

  return html`
    <${Box} flexDirection="column" flexGrow=${1} paddingX=${1} overflowY="hidden">
      ${visibleHistory.length === 0 && !running && html`
        <${Text} dimColor>No results yet. Type a task below or press / for commands.<//>`}
      ${visibleHistory.map((entry, i) => html`<${ResultEntry} key=${i} entry=${entry} />`)}
      ${running && html`<${Text} color="yellow">Running...<//>`}
    <//>
  `;
};
