#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import { createSystemContext, prepareOptions, runTemplate, type Template } from "bingo";
import { runInsideClackDisplay } from "bingo/lib/cli/display/runInsideClackDisplay.js";
import { runSpinnerTask } from "bingo/lib/cli/display/runSpinnerTask.js";
import { logStartText } from "bingo/lib/cli/loggers/logStartText.js";
import { CLIMessage } from "bingo/lib/cli/messages.js";
import { CLIStatus } from "bingo/lib/cli/status.js";

import { intakeForTransition } from "../src/blocks/intake/intakeForTransition.ts";
import template from "../src/template.ts";

const directory = ".";
const typedTemplate = template as unknown as Template;

const require = createRequire(import.meta.url);

const templatePackageData = JSON.parse(
  await readFile(require.resolve("@jaykingson/vite-plus-base/package.json"), "utf8"),
) as { name: string; version: string };

process.exitCode = await runInsideClackDisplay(templatePackageData, async (display) => {
  logStartText("transition", false);

  const readResult = await runSpinnerTask(
    display,
    "Inferring options from existing repository",
    "Inferred options from existing repository",
    async () => {
      const files = await intakeForTransition(directory);
      const system = createSystemContext({ directory, display, offline: true });
      const options = await prepareOptions(typedTemplate, {
        ...system,
        directory,
        files,
        offline: true,
        existing: { directory },
      });

      return { files, options, system };
    },
  );

  if (readResult instanceof Error) {
    return { status: CLIStatus.Error, outro: CLIMessage.Leaving };
  }

  const { files, options, system } = readResult;

  const creation = await runSpinnerTask(
    display,
    `Running ${templatePackageData.name}`,
    `Ran ${templatePackageData.name}`,
    async () =>
      await runTemplate(typedTemplate, {
        ...system,
        directory,
        files,
        mode: "transition",
        offline: true,
        options,
        skips: { requests: true },
      }),
  );

  if (creation instanceof Error) {
    return { status: CLIStatus.Error, outro: CLIMessage.Leaving };
  }

  return {
    status: CLIStatus.Success,
    outro: CLIMessage.Done,
    suggestions: creation.suggestions,
  };
});
