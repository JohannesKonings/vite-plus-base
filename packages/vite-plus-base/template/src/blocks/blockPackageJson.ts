import { z } from "zod";

import { base } from "../base.ts";
import { intakeFileAsJson } from "./intake/intakeFileAsJson.ts";
import { formatPackageJson, mergeDevDependencies } from "./package-json.ts";

const packageJsonProperties = z
  .object({
    name: z.string().optional(),
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
    if (!packageData) {
      return undefined;
    }

    return {
      properties: {
        existingPackage: packageData,
      },
    };
  },
  produce({ addons, options }) {
    const existingPackage =
      (addons.properties.existingPackage as Record<string, unknown> | undefined) ??
      options.packageData;
    const packageData = { ...existingPackage };
    const name = options.name ?? addons.properties.name;
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
