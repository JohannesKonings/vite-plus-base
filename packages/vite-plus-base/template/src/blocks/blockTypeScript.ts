import { z } from "zod";

import { base } from "../base.ts";
import { getPackageDependencies } from "../data/packageData.ts";
import { blockPackageJson } from "./blockPackageJson/blockPackageJson.ts";
import { intakeFileAsJson } from "./intake/intakeFileAsJson.ts";

function typescriptPackageJsonAddon(packageData: Record<string, unknown> | undefined) {
  const existingDevDependencies = packageData?.devDependencies as
    | Record<string, string>
    | undefined;
  const versions = getPackageDependencies("typescript", "@types/node");

  return blockPackageJson({
    properties: {
      existingPackage: packageData,
      devDependencies: {
        typescript: existingDevDependencies?.typescript ?? versions.typescript,
        "@types/node": existingDevDependencies?.["@types/node"] ?? versions["@types/node"],
      },
    },
  });
}

function resolvePackageData(
  addons: { packageData?: Record<string, unknown> },
  options: { packageData?: Record<string, unknown> },
) {
  return addons.packageData ?? options.packageData;
}

function blockTypeScriptCreation({
  addons,
  options,
}: {
  addons: { packageData?: Record<string, unknown> };
  options: { packageData?: Record<string, unknown> };
}) {
  const packageData = resolvePackageData(addons, options);

  return {
    addons: [typescriptPackageJsonAddon(packageData)],
    suggestions: ["typescript and @types/node were added to devDependencies."],
  };
}

export const blockTypeScript = base.createBlock({
  about: {
    name: "TypeScript",
  },
  addons: {
    packageData: z.record(z.string(), z.unknown()).optional(),
  },
  intake({ files }) {
    const packageData = intakeFileAsJson(files, ["package.json"]);
    if (!packageData) {
      return undefined;
    }

    return { packageData };
  },
  produce(context) {
    return blockTypeScriptCreation(context);
  },
  transition(context) {
    return blockTypeScriptCreation(context);
  },
});
