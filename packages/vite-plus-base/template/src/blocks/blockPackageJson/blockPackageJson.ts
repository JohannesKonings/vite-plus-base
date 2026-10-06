import { z } from "zod";

import { blockPackageJsonConfigSchema } from "../../../../src/workspace-config.ts";
import { base } from "../../base.ts";
import { detectWorkspaceShape, type WorkspaceShape } from "../intake/detectWorkspaceShape.ts";
import { intakeFile } from "../intake/intakeFile.ts";
import { intakeFileAsJson } from "../intake/intakeFileAsJson.ts";
import { intakeWorkspaceBingo } from "../intake/intakeWorkspaceBingo.ts";
import { formatMinimalPnpmWorkspaceYaml, mergePnpmWorkspaceYaml } from "./pnpm-workspace.ts";
import {
  defaultDevEngines,
  defaultEngines,
  formatPackageJson,
  mergeDevDependencies,
} from "./package-json.ts";

const packageJsonProperties = blockPackageJsonConfigSchema
  .partial()
  .extend({
    devDependencies: z.record(z.string(), z.string()).optional(),
    existingPackage: z.record(z.string(), z.unknown()).optional(),
    existingPnpmWorkspace: z.string().optional(),
    workspaceShape: z.enum(["single-package", "package-workspace"]).optional(),
  })
  .default({});

function createPnpmWorkspaceYaml(workspaceShape: WorkspaceShape, existingPnpmWorkspace?: string) {
  if (workspaceShape === "package-workspace" && existingPnpmWorkspace) {
    return mergePnpmWorkspaceYaml(existingPnpmWorkspace);
  }

  return formatMinimalPnpmWorkspaceYaml();
}

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
    const existingPnpmWorkspace = intakeFile(files, ["pnpm-workspace.yaml"]);

    if (!packageData && !blockConfig) {
      return undefined;
    }

    return {
      properties: {
        ...blockConfig,
        ...(packageData ? { existingPackage: packageData } : {}),
        ...(existingPnpmWorkspace ? { existingPnpmWorkspace: existingPnpmWorkspace[0] } : {}),
        workspaceShape: detectWorkspaceShape(files),
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

    const workspaceShape = addons.properties.workspaceShape ?? "single-package";
    const existingPnpmWorkspace = addons.properties.existingPnpmWorkspace;

    return {
      files: {
        "package.json": formatPackageJson(packageData, {
          name,
          devDependencies,
          devEngines: defaultDevEngines,
          engines: defaultEngines,
        }),
        "pnpm-workspace.yaml": createPnpmWorkspaceYaml(workspaceShape, existingPnpmWorkspace),
      },
      scripts: [{ phase: 0, commands: ["vp install"] }],
    };
  },
});
