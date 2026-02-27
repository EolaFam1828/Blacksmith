import assert from "node:assert/strict";
import test from "node:test";
import { commands, parseInput } from "../src/tui/commands.js";

test("command registry contains all 18 commands", () => {
  assert.equal(commands.length, 18);

  const names = commands.map((c) => c.name);
  const expected = [
    "ask", "build", "research", "compare", "summarize", "debug",
    "refactor", "review", "commit", "deploy", "diagnose", "provision",
    "brain", "identity", "mcr", "config", "spend", "map",
  ];

  for (const name of expected) {
    assert.ok(names.includes(name), `Missing command: ${name}`);
  }
});

test("all commands have required metadata fields", () => {
  for (const cmd of commands) {
    assert.ok(typeof cmd.name === "string" && cmd.name.length > 0, `${cmd.name} has name`);
    assert.ok(typeof cmd.description === "string" && cmd.description.length > 0, `${cmd.name} has description`);
    assert.ok(typeof cmd.hasTaskArg === "boolean", `${cmd.name} has hasTaskArg`);
    assert.ok(typeof cmd.department === "string" && cmd.department.length > 0, `${cmd.name} has department`);
  }
});

test("parseInput recognises known commands", () => {
  const result = parseInput("build a REST API");
  assert.equal(result.command, "build");
  assert.equal(result.task, "a REST API");
});

test("parseInput defaults unknown input to ask", () => {
  const result = parseInput("what is the meaning of life");
  assert.equal(result.command, "ask");
  assert.equal(result.task, "what is the meaning of life");
});

test("parseInput handles command with no task", () => {
  const result = parseInput("commit");
  assert.equal(result.command, "commit");
  assert.equal(result.task, "");
});

test("parseInput returns null for empty input", () => {
  assert.equal(parseInput(""), null);
  assert.equal(parseInput("   "), null);
});

test("parseInput is case-insensitive for command matching", () => {
  const result = parseInput("BUILD something");
  assert.equal(result.command, "build");
  assert.equal(result.task, "something");
});

test("fuzzy search via Fuse.js finds approximate matches", async () => {
  const Fuse = (await import("fuse.js")).default;
  const fuse = new Fuse(commands, {
    keys: ["name", "description"],
    threshold: 0.4,
  });

  const bldResults = fuse.search("bld");
  assert.ok(
    bldResults.some((r) => r.item.name === "build"),
    "\"bld\" should fuzzy-match \"build\""
  );

  const researchResults = fuse.search("reserch");
  assert.ok(
    researchResults.some((r) => r.item.name === "research"),
    "\"reserch\" should fuzzy-match \"research\""
  );
});
