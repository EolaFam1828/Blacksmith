import fs from "node:fs/promises";
import { getMcrPath, loadMcr, saveMcr } from "../utils/config.js";

export const updateMcr = async () => {
  const mcr = await loadMcr();
  mcr.last_updated = new Date().toISOString().slice(0, 10);
  mcr.update_notes = [
    "Semi-automated update completed.",
    "Review benchmark_sources manually before trusting new routing decisions."
  ];
  await saveMcr(mcr);
  return mcr;
};

export const getMcrEditTarget = async () => {
  await fs.access(getMcrPath());
  return getMcrPath();
};
