import { html, React } from "./html.js";
import { Box, Text } from "ink";
import { TextInput } from "@inkjs/ui";
import Fuse from "fuse.js";
import { commands } from "./commands.js";

const { useState, useMemo } = React;

const fuse = new Fuse(commands, {
  keys: ["name", "description"],
  threshold: 0.4,
});

export const CommandPalette = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!query.trim()) return commands;
    return fuse.search(query).map((r) => r.item);
  }, [query]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleSubmit = () => {
    const selected = matches[selectedIndex];
    if (selected) {
      onSelect(selected.name);
    }
  };

  const handleChange = (value) => {
    setQuery(value);
    setSelectedIndex(0);
  };

  return html`
    <${Box} flexDirection="column" borderStyle="double" borderColor="magenta" paddingX=${1} paddingY=${0}>
      <${Text} bold color="magenta">Command Palette<//>
      <${Box} marginTop=${0}>
        <${Text} color="magenta">${"/ "}<//>
        <${TextInput}
          value=${query}
          onChange=${handleChange}
          onSubmit=${handleSubmit}
          placeholder="Search commands..."
        />
      <//>
      <${Box} flexDirection="column" marginTop=${1}>
        ${matches.slice(0, 8).map((cmd, i) => html`
          <${Box} key=${cmd.name}>
            <${Text} color=${i === selectedIndex ? "cyan" : "white"} bold=${i === selectedIndex}>
              ${i === selectedIndex ? "> " : "  "}${cmd.name}
            <//>
            <${Text} dimColor>${"  "}${cmd.description}<//>
          <//>
        `)}
      <//>
      <${Text} dimColor marginTop=${1}>Enter: select | Esc: close<//>
    <//>
  `;
};
