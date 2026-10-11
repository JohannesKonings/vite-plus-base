import { z } from "zod";

import { base } from "../../base.ts";
import { getPackageDependencies } from "../../data/packageData.ts";
import { blockPackageJson } from "../blockPackageJson/blockPackageJson.ts";
import {
  collectTextFiles,
  writeNestedFile,
  type CreatedDirectory,
  type IntakeTextFile,
} from "./collectTextFiles.ts";
import { createOxnodeDoc } from "./createOxnodeDoc.ts";
import { migrateCdkJson, migratePackageManifest, scriptReplacements } from "./migrateManifests.ts";
import { rewritePackageScripts } from "./rewriteTsxCommand.ts";

const textFileSchema = z.object({
  path: z.string(),
  text: z.string(),
});

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function directoryOf(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index === -1 ? "." : filePath.slice(0, index);
}

function dependencyRecord(manifest: JsonRecord | undefined, field: string) {
  const value = manifest?.[field];
  return isRecord(value) ? (value as Record<string, string>) : undefined;
}

function hasNamedDependency(manifest: JsonRecord | undefined, name: string) {
  return ["dependencies", "devDependencies", "optionalDependencies"].some((field) => {
    const dependencies = dependencyRecord(manifest, field);
    return dependencies ? name in dependencies : false;
  });
}

export function runnerDevDependencies(existing: Record<string, string> | undefined) {
  const versions = getPackageDependencies("@oxc-node/cli", "@oxc-node/core");
  return {
    "@oxc-node/cli": existing?.["@oxc-node/cli"] ?? versions["@oxc-node/cli"],
    "@oxc-node/core": existing?.["@oxc-node/core"] ?? versions["@oxc-node/core"],
  };
}

function fallbackRunnerVersions() {
  return getPackageDependencies("@oxc-node/cli", "@oxc-node/core");
}

function blockOxnodeCreation({
  addons,
  options,
}: {
  addons: {
    packageManifests?: IntakeTextFile[];
    cdkManifests?: IntakeTextFile[];
    extraDevDependencies?: Record<string, string>;
    extraPackagePaths?: string[];
  };
  options: { packageData?: JsonRecord };
}) {
  const packageManifests = addons.packageManifests ?? [];
  const cdkManifests = addons.cdkManifests ?? [];
  const extraPackagePaths = new Set(addons.extraPackagePaths ?? []);
  const files: CreatedDirectory = {
    docs: {
      agents: {
        "oxnode.md": createOxnodeDoc(),
      },
    },
  };
  const manual: string[] = [];
  const cdkByDirectory = new Map<string, IntakeTextFile>();

  for (const cdk of cdkManifests) {
    cdkByDirectory.set(directoryOf(cdk.path), cdk);
    try {
      const migrated = migrateCdkJson(cdk.text, cdk.path);
      manual.push(...migrated.manual);
      if (migrated.changed) {
        writeNestedFile(files, cdk.path, migrated.text);
      }
    } catch {
      manual.push(`${cdk.path}: could not parse; commands were left unchanged`);
    }
  }

  const rootFile = packageManifests.find((manifest) => manifest.path === "package.json");
  let rootManifest: JsonRecord | undefined;
  if (rootFile) {
    try {
      rootManifest = JSON.parse(rootFile.text) as JsonRecord;
    } catch {
      manual.push("package.json: could not parse; scripts were left unchanged");
    }
  } else if (options.packageData) {
    rootManifest = options.packageData;
  }

  const rootScripts = isRecord(rootManifest?.scripts) ? rootManifest.scripts : undefined;
  const rewrittenRootScripts = rewritePackageScripts(rootScripts);
  manual.push(...rewrittenRootScripts.manual);
  const replacements = scriptReplacements(rootScripts ?? {}, rewrittenRootScripts.scripts ?? {});

  const rootCdk = cdkByDirectory.get(".");
  let rootCdkNeedsTsx = false;
  if (rootCdk) {
    try {
      rootCdkNeedsTsx = migrateCdkJson(rootCdk.text, rootCdk.path).stillNeedsTsx;
    } catch {
      rootCdkNeedsTsx = false;
    }
  }

  const rootStillNeedsTsx = rewrittenRootScripts.stillNeedsTsx || rootCdkNeedsTsx;
  const removeTsx = !rootStillNeedsTsx && hasNamedDependency(rootManifest, "tsx");
  const runnerVersions = fallbackRunnerVersions();
  let removedTsx = removeTsx;

  for (const manifest of packageManifests) {
    if (manifest.path === "package.json") {
      continue;
    }

    const directory = directoryOf(manifest.path);
    const cdk = cdkByDirectory.get(directory);
    let keepTsx = false;
    let forceRunner = false;
    if (cdk) {
      try {
        const migrated = migrateCdkJson(cdk.text, cdk.path);
        keepTsx = migrated.stillNeedsTsx;
        forceRunner = migrated.changed || migrated.stillNeedsTsx;
      } catch {
        keepTsx = true;
      }
    }

    try {
      const migrated = migratePackageManifest(manifest.text, runnerVersions, {
        extraDevDependencies: extraPackagePaths.has(manifest.path)
          ? addons.extraDevDependencies
          : undefined,
        forceRunner,
        keepTsx,
      });
      manual.push(...migrated.manual.map((reason) => `${manifest.path} ${reason}`));
      if (migrated.changed) {
        writeNestedFile(files, manifest.path, migrated.text);
      }
      if (migrated.changed && !migrated.stillNeedsTsx && manifest.text.includes('"tsx"')) {
        removedTsx = true;
      }
    } catch {
      manual.push(`${manifest.path}: could not parse; left unchanged`);
    }
  }

  for (const cdk of cdkManifests) {
    const directory = directoryOf(cdk.path);
    if (directory === ".") {
      continue;
    }
    const hasPackage = packageManifests.some(
      (manifest) => directoryOf(manifest.path) === directory,
    );
    if (!hasPackage) {
      manual.push(
        `${cdk.path}: no sibling package.json, so @oxc-node/cli was not added in that directory`,
      );
    }
  }

  const suggestions = [
    "TypeScript scripts run with oxnode (@oxc-node/cli). See docs/agents/oxnode.md.",
  ];
  if (removedTsx) {
    suggestions.push(
      "tsx was removed where intaken scripts and cdk.json commands no longer call it. Update workflows and shell scripts that still call tsx. See docs/agents/oxnode.md.",
    );
  }
  if (manual.length > 0) {
    suggestions.push(
      `tsx commands left unchanged: ${manual.join("; ")}. See docs/agents/oxnode.md.`,
    );
  }

  return {
    addons: [
      blockPackageJson({
        properties: {
          devDependencies: runnerDevDependencies(dependencyRecord(rootManifest, "devDependencies")),
          ...(removeTsx ? { removeDependencies: ["tsx"] } : {}),
          ...(Object.keys(replacements).length > 0 ? { scriptReplacements: replacements } : {}),
        },
      }),
    ],
    files,
    suggestions,
  };
}

export const blockOxnode = base.createBlock({
  about: {
    name: "Oxnode",
  },
  addons: {
    packageManifests: z.array(textFileSchema).optional(),
    cdkManifests: z.array(textFileSchema).optional(),
    extraDevDependencies: z.record(z.string(), z.string()).optional(),
    extraPackagePaths: z.array(z.string()).optional(),
  },
  intake({ files }) {
    const packageManifests = collectTextFiles(files, "package.json");
    const cdkManifests = collectTextFiles(files, "cdk.json");
    if (packageManifests.length === 0 && cdkManifests.length === 0) {
      return undefined;
    }

    return { packageManifests, cdkManifests };
  },
  produce(context) {
    return blockOxnodeCreation(context);
  },
  transition(context) {
    return blockOxnodeCreation(context);
  },
});
