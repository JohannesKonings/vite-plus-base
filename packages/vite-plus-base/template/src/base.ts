import path from "node:path";

import { createBase } from "bingo-stratum";
import { z } from "zod";

import { intakeFileAsJson } from "./blocks/intake/intakeFileAsJson.ts";
import { intakeWorkspaceBingo } from "./blocks/intake/intakeWorkspaceBingo.ts";

const packageDataSchema = z.record(z.string(), z.unknown()).optional();
const glossaryMapSchema = z
  .record(
    z.string(),
    z.object({
      glossary: z.string(),
      adr: z.string().optional(),
      summary: z.string().optional(),
    }),
  )
  .optional();

export const base = createBase({
  options: {
    directory: z.string().optional().describe("Project directory"),
    name: z.string().describe("Package name from package.json or project directory"),
    packageData: packageDataSchema.describe("Existing package.json data"),
    glossaryMap: glossaryMapSchema.describe(
      "Per-context glossary map from vite.config.ts bingo.blockAgentSkills",
    ),
  },
  prepare({ files, options }) {
    const packageData = files ? intakeFileAsJson(files, ["package.json"]) : undefined;
    const workspaceBingo = files ? intakeWorkspaceBingo(files) : undefined;
    const nameFromPackage =
      packageData && typeof packageData.name === "string" ? packageData.name : undefined;
    const directory = options.directory ?? ".";
    const nameFromDirectory = path.basename(path.resolve(directory));

    return {
      packageData,
      name: options.name ?? nameFromPackage ?? nameFromDirectory,
      glossaryMap: options.glossaryMap ?? workspaceBingo?.blockAgentSkills?.glossaryMap,
    };
  },
});
