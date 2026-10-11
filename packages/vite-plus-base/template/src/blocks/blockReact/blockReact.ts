import { z } from "zod";

import { base } from "../../base.ts";
import { getPackageDependencies } from "../../data/packageData.ts";
import { blockOxnode } from "../blockOxnode/blockOxnode.ts";
import { collectTextFiles } from "../blockOxnode/collectTextFiles.ts";
import { blockPackageJson } from "../blockPackageJson/blockPackageJson.ts";
import { intakeWorkspaceBingo } from "../intake/intakeWorkspaceBingo.ts";
import { createReactViteDoc, createReactViteModule } from "./createReactViteFiles.ts";

const REACT_PACKAGES = ["react", "react-dom", "@vitejs/plugin-react"] as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function dependsOnReact(manifest: JsonRecord) {
  return ["dependencies", "devDependencies", "optionalDependencies"].some((field) => {
    const dependencies = manifest[field];
    if (!isRecord(dependencies)) {
      return false;
    }

    return REACT_PACKAGES.some((name) => name in dependencies);
  });
}

function readRootDevDependencies(files: Record<string, unknown>) {
  const root = collectTextFiles(files, "package.json").find(
    (manifest) => manifest.path === "package.json",
  );
  if (!root) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(root.text) as JsonRecord;
    return isRecord(parsed.devDependencies)
      ? (parsed.devDependencies as Record<string, string>)
      : undefined;
  } catch {
    return undefined;
  }
}

function reactPackagePaths(files: Record<string, unknown>) {
  const paths: string[] = [];

  for (const manifest of collectTextFiles(files, "package.json")) {
    if (manifest.path === "package.json") {
      continue;
    }

    try {
      const parsed = JSON.parse(manifest.text) as JsonRecord;
      if (dependsOnReact(parsed)) {
        paths.push(manifest.path);
      }
    } catch {
      // The oxnode block reports package.json files it cannot parse.
    }
  }

  return paths;
}

export function reactDevDependencies(
  existing: Record<string, string> | undefined,
  oxcCompiler: boolean,
) {
  const names = oxcCompiler
    ? ["@vitejs/plugin-react", "oxc-transform-react"]
    : ["@vitejs/plugin-react"];
  const versions = getPackageDependencies(...names);
  const devDependencies: Record<string, string> = {};

  for (const name of names) {
    const version = versions[name];
    if (!version) {
      throw new Error(`Missing catalog version for ${name}.`);
    }
    devDependencies[name] = existing?.[name] ?? version;
  }

  return devDependencies;
}

function blockReactCreation({
  addons,
}: {
  addons: {
    enabled?: boolean;
    oxcCompiler?: boolean;
    packagePaths?: string[];
    existingDevDependencies?: Record<string, string>;
  };
}) {
  if (!addons.enabled) {
    return {};
  }

  const oxcCompiler = addons.oxcCompiler ?? false;
  const devDependencies = reactDevDependencies(addons.existingDevDependencies, oxcCompiler);

  return {
    addons: [
      blockPackageJson({
        properties: {
          devDependencies,
        },
      }),
      blockOxnode({
        extraDevDependencies: devDependencies,
        extraPackagePaths: addons.packagePaths,
      }),
    ],
    files: {
      docs: {
        agents: {
          "react-vite.md": createReactViteDoc(oxcCompiler),
        },
      },
      tooling: {
        vite: {
          "react.ts": createReactViteModule(oxcCompiler),
        },
      },
    },
    suggestions: [
      oxcCompiler
        ? "Experimental Oxc React Compiler is on (react({ compiler: true }) with oxc-transform-react). See docs/agents/react-vite.md."
        : "React for Vite 8 is set up with @vitejs/plugin-react. The Oxc React Compiler is off. See docs/agents/react-vite.md.",
    ],
  };
}

export const blockReact = base.createBlock({
  about: {
    name: "React",
  },
  addons: {
    enabled: z.boolean().optional(),
    oxcCompiler: z.boolean().optional(),
    packagePaths: z.array(z.string()).optional(),
    existingDevDependencies: z.record(z.string(), z.string()).optional(),
  },
  intake({ files }) {
    const blockReactConfig = intakeWorkspaceBingo(files)?.blockReact;
    if (!blockReactConfig) {
      return undefined;
    }

    return {
      enabled: true,
      oxcCompiler: blockReactConfig.oxcCompiler ?? false,
      packagePaths: reactPackagePaths(files),
      existingDevDependencies: readRootDevDependencies(files),
    };
  },
  produce(context) {
    return blockReactCreation(context);
  },
  transition(context) {
    return blockReactCreation(context);
  },
});
