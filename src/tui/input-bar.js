import { html, React } from "./html.js";
import { Box, Text } from "ink";
import { TextInput } from "@inkjs/ui";
import { parseInput } from "./commands.js";

const { useState, useCallback } = React;

export const InputBar = ({ onSubmit, onPalette, onHelp, disabled }) => {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback((input) => {
    const parsed = parseInput(input);
    if (parsed) {
      onSubmit(parsed.command, parsed.task);
    }
    setValue("");
  }, [onSubmit]);

  const handleChange = useCallback((newValue) => {
    if (newValue === "/" && value === "") {
      onPalette();
      return;
    }
    if (newValue === "?" && value === "") {
      onHelp();
      return;
    }
    setValue(newValue);
  }, [value, onPalette, onHelp]);

  return html`
    <${Box} paddingX=${1} borderStyle="single" borderColor="green">
      <${Text} color="green" bold>${"> "}<//>
      <${TextInput}
        value=${value}
        onChange=${handleChange}
        onSubmit=${handleSubmit}
        placeholder="Type a task or / for commands..."
        isDisabled=${disabled}
      />
    <//>
  `;
};
