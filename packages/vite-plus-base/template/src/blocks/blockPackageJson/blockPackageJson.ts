import { z } from "zod";

import { blockPackageJsonConfigSchema } from "../../../../src/workspace-config.ts";
import { base } from "../../base.ts";
import { intakeFileAsJson } from "../intake/intakeFileAsJson.ts";
import { intakeWorkspaceBingo } from "../intake/intakeWorkspaceBingo.ts";
import { formatPackageJson, mergeDevDependencies } from "./package-json.ts";

const packageJsonProperties = blockPackageJsonConfigSchema
  .partial()
  .extend({
    devDependencies: z.record(z.string(), z.string()).optional(),
    existingPackage: z.record(z.string(), z.unknown()).optional(),
  })
  .default({});

export const blockPackageJson = base.createBlock({
  about: {
    name: "Package JSON",
  },
  addons: {
    properties: packageJsonProperties,
  },
  intake({ files }) {
    const packageData = intakeFileAsJson(files, ["package.json"]);
    const workspaceBingo = intakeWorkspaceBingo(files);
    const blockConfig = workspaceBingo?.blockPackageJson;

    if (!packageData && !blockConfig) {
      return undefined;
    }

    return {
      properties: {
        ...blockConfig,
        ...(packageData ? { existingPackage: packageData } : {}),
      },
    };
  },
  produce({ addons, options }) {
    const existingPackage =
      (addons.properties.existingPackage as Record<string, unknown> | undefined) ??
      options.packageData;
    const packageData = { ...existingPackage };
    const name = addons.properties.name ?? options.name;
    const devDependencies = mergeDevDependencies(
      packageData.devDependencies as Record<string, string> | undefined,
      addons.properties.devDependencies,
    );

    return {
      files: {
        "package.json": formatPackageJson(packageData, { name, devDependencies }),
      },
      scripts: [{ phase: 0, commands: ["vp install"] }],
    };
  },
});
