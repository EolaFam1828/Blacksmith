import { createInterface } from "node:readline";

const AUTO_APPROVE = process.env.BLACKSMITH_AUTO_APPROVE === "1";

const ask = (question) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

export const confirmAction = async (message) => {
  if (AUTO_APPROVE) return true;
  const answer = await ask(`${message} [y/N] `);
  return /^y(es)?$/i.test(answer);
};

export const selectOption = async (message, options) => {
  if (AUTO_APPROVE) return 0;
  const lines = [message, ...options.map((opt, i) => `  ${i + 1}) ${opt}`), "Selection: "];
  const answer = await ask(lines.join("\n"));
  const idx = parseInt(answer, 10) - 1;
  return idx >= 0 && idx < options.length ? idx : 0;
};
