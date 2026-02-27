#!/usr/bin/env node

const main = async () => {
  if (process.argv.length === 2) {
    const { launchTui } = await import("../src/tui/index.js");
    await launchTui();
  } else {
    const { runCli } = await import("../src/cli.js");
    await runCli(process.argv);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`blacksmith: ${message}`);
  process.exitCode = 1;
});
