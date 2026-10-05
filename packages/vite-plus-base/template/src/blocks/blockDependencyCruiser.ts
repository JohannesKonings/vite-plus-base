import { z } from "zod";

import { base } from "../base.ts";
import { blockPackageJson } from "./blockPackageJson.ts";
import { blockRemoveFiles } from "./blockRemoveFiles.ts";
import { projectDependencyCruiserConfig } from "./contents/dependencyCruiserConfig.ts";
import { intakeFileAsJson } from "./intake/intakeFileAsJson.ts";

const DEPENDENCY_CRUISER_VERSION = "^18.5.0";
export const DEPENDENCY_CRUISER_CONFIG_PATH = ".dependency-cruiser.cjs";

/**
 * Basenames from older template versions.
 * Transition deletes every match, including nested copies such as
 * `packages/vite-plus-base/dependency-cruiser.cjs`.
 */
export const OUTDATED_TEMPLATE_FILES = ["dependency-cruiser.cjs"];

function dependencyCruiserPackageJsonAddon(packageData: Record<string, unknown> | undefined) {
  const existingDevDependencies = packageData?.devDependencies as
    | Record<string, string>
    | undefined;

  return blockPackageJson({
    properties: {
      existingPackage: packageData,
      devDependencies: {
        "dependency-cruiser":
          existingDevDependencies?.["dependency-cruiser"] ?? DEPENDENCY_CRUISER_VERSION,
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

export const blockDependencyCruiser = base.createBlock({
  about: {
    name: "Dependency Cruiser",
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
  produce({ addons, options }) {
    const packageData = resolvePackageData(addons, options);

    return {
      addons: [dependencyCruiserPackageJsonAddon(packageData)],
      files: {
        [DEPENDENCY_CRUISER_CONFIG_PATH]: projectDependencyCruiserConfig,
      },
      suggestions: [
        "dependency-cruiser was added to devDependencies.",
        "Run dependency analysis: pnpm exec depcruise src",
      ],
    };
  },
  transition({ addons, options }) {
    const packageData = resolvePackageData(addons, options);

    return {
      addons: [
        dependencyCruiserPackageJsonAddon(packageData),
        ...(OUTDATED_TEMPLATE_FILES.length
          ? [blockRemoveFiles({ files: OUTDATED_TEMPLATE_FILES })]
          : []),
      ],
      files: {
        [DEPENDENCY_CRUISER_CONFIG_PATH]: projectDependencyCruiserConfig,
      },
      suggestions: [
        "devDependencies were refreshed from @jaykingson/vite-plus-base.",
        "Run vp install if dependency-cruiser was added or updated.",
      ],
    };
  },
});
