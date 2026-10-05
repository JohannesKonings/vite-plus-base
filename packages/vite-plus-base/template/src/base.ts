import path from "node:path";

import { createBase } from "bingo-stratum";
import { z } from "zod";

import { intakeFileAsJson } from "./blocks/intake/intakeFileAsJson.ts";

const packageDataSchema = z.record(z.string(), z.unknown()).optional();

export const base = createBase({
  options: {
    directory: z.string().optional().describe("Project directory"),
    name: z.string().describe("Package name from package.json or project directory"),
    packageData: packageDataSchema.describe("Existing package.json data"),
  },
  prepare({ files, options }) {
    const packageData = files ? intakeFileAsJson(files, ["package.json"]) : undefined;
    const nameFromPackage =
      packageData && typeof packageData.name === "string" ? packageData.name : undefined;
    const directory = options.directory ?? ".";
    const nameFromDirectory = path.basename(path.resolve(directory));

    return {
      packageData,
      name: options.name ?? nameFromPackage ?? nameFromDirectory,
    };
  },
});
