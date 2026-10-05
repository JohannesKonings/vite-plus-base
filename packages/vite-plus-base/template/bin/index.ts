#!/usr/bin/env node

import { runTemplateCLI, type Template } from "bingo";

import template from "../src/template.ts";

try {
  process.exitCode = await runTemplateCLI(template as unknown as Template);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
