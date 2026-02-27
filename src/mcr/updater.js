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

export const checkForUpdates = async () => {
  const mcr = await loadMcr();
  const sources = mcr.benchmark_sources || [];
  const results = [];

  for (const source of sources) {
    try {
      const resp = await fetch(source);
      if (resp.ok) {
        const text = await resp.text();
        results.push({ source, data: text.slice(0, 5000), status: "fetched" });
      } else {
        results.push({ source, status: "error", code: resp.status });
      }
    } catch (error) {
      results.push({ source, status: "error", message: error.message });
    }
  }

  return results;
};

export const suggestMcrChanges = (benchmarkData, currentMcr) => {
  const suggestions = [];
  const modelNames = Object.keys(currentMcr.models || {});

  for (const entry of benchmarkData) {
    if (entry.status !== "fetched") continue;

    for (const modelName of modelNames) {
      const model = currentMcr.models[modelName];
      const lower = entry.data.toLowerCase();

      if (lower.includes(modelName.replace(/-/g, " ")) || lower.includes(modelName)) {
        const pricingMatch = entry.data.match(
          new RegExp(`${modelName.replace(/-/g, "[\\s-]")}[^\\n]*\\$([\\d.]+)`, "i")
        );
        if (pricingMatch) {
          const newPrice = parseFloat(pricingMatch[1]);
          if (newPrice !== model.pricing?.input_per_1m) {
            suggestions.push({
              model: modelName,
              field: "pricing.input_per_1m",
              current: model.pricing?.input_per_1m,
              suggested: newPrice,
              source: entry.source
            });
          }
        }
      }
    }
  }

  return suggestions;
};

export const applyMcrUpdate = async (changes) => {
  const mcr = await loadMcr();

  for (const change of changes) {
    const model = mcr.models?.[change.model];
    if (!model) continue;

    const parts = change.field.split(".");
    let target = model;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]] = target[parts[i]] || {};
    }
    target[parts[parts.length - 1]] = change.suggested;
  }

  mcr.last_updated = new Date().toISOString().slice(0, 10);
  mcr.update_notes = [
    `Applied ${changes.length} changes from benchmark sources.`,
    `Updated: ${new Date().toISOString()}`
  ];
  await saveMcr(mcr);
  return mcr;
};
