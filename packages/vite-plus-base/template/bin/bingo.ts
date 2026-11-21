#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { createSystemContext, prepareOptions, runTemplate, type Template } from "bingo";

import { intakeForTransition } from "../src/blocks/intake/intakeForTransition.ts";
import template from "../src/template.ts";

const directory = ".";
const typedTemplate = template as unknown as Template;

const require = createRequire(import.meta.url);

const templatePackageData = JSON.parse(
  await readFile(require.resolve("@jaykingson/vite-plus-base/package.json"), "utf8"),
) as { name: string; version: string };

console.log(
  `Running ${templatePackageData.name}@${templatePackageData.version} in transition mode`,
);

try {
  const files = await intakeForTransition(directory);
  const system = createSystemContext({ directory, offline: true });
  const options = await prepareOptions(typedTemplate, {
    ...system,
    directory,
    files,
    offline: true,
    existing: { directory },
  });

  const creation = await runTemplate(typedTemplate, {
    ...system,
    directory,
    files,
    mode: "transition",
    offline: true,
    options,
    skips: { requests: true },
  });

  for (const suggestion of creation.suggestions ?? []) {
    console.log(suggestion);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
