import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";

const require = createRequire(import.meta.url);

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export const packageData = require("@jaykingson/vite-plus-base/package.json") as PackageManifest;

const packageRoot = dirname(require.resolve("@jaykingson/vite-plus-base/package.json"));

export function getPackageDependencies(...names: string[]) {
  return Object.fromEntries(names.map((name) => [name, getPackageDependency(name)]));
}

export function getPackageDependency(name: string) {
  const version = packageData.devDependencies?.[name] ?? packageData.dependencies?.[name];

  if (!version) {
    throw new Error(`'${name}' is neither in package.json's dependencies nor its devDependencies.`);
  }

  return resolveCatalogSpecifier(name, version);
}

function resolveCatalogSpecifier(name: string, version: string) {
  if (!version.startsWith("catalog:")) {
    return version;
  }

  const catalogName = version.slice("catalog:".length) || "default";
  const entry = readOwningCatalogEntry(catalogName, name);

  if (!entry) {
    throw new Error(`No catalog entry '${name}' was found for catalog '${catalogName}'.`);
  }

  return entry;
}

function readOwningCatalogEntry(catalogName: string, name: string) {
  let dir = packageRoot;

  while (true) {
    const workspaceFile = join(dir, "pnpm-workspace.yaml");
    if (existsSync(workspaceFile) && !isInsideNodeModules(packageRoot, dir)) {
      const entry = readCatalogEntry(readFileSync(workspaceFile, "utf8"), catalogName, name);
      if (entry) {
        return entry;
      }
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }

    dir = parent;
  }
}

function isInsideNodeModules(packageDir: string, workspaceDir: string) {
  return relative(workspaceDir, packageDir).split(sep).includes("node_modules");
}

function readCatalogEntry(yaml: string, catalogName: string, name: string) {
  const catalogs = readCatalogs(yaml);
  return catalogs[catalogName]?.[name];
}

function readCatalogs(yaml: string) {
  const catalogs: Record<string, Record<string, string>> = { default: {} };
  let section: "catalog" | "catalogs" | "none" = "none";
  let namedCatalog: string | undefined;

  for (const rawLine of yaml.split("\n")) {
    const line = rawLine.replace(/\s+#.*$/, "");
    if (!line.trim()) {
      continue;
    }

    const indent = line.match(/^ */)?.[0].length ?? 0;
    const trimmed = line.trim();

    if (indent === 0) {
      namedCatalog = undefined;
      if (trimmed === "catalog:") {
        section = "catalog";
      } else if (trimmed === "catalogs:") {
        section = "catalogs";
      } else {
        section = "none";
      }
      continue;
    }

    if (section === "none") {
      continue;
    }

    const namedHeader = trimmed.match(/^(?:"([^"]+)"|([^":]+)):$/);
    if (section === "catalogs" && indent === 2 && namedHeader) {
      namedCatalog = namedHeader[1] ?? namedHeader[2];
      catalogs[namedCatalog] ??= {};
      continue;
    }

    const entry = trimmed.match(/^(?:"([^"]+)"|([^":]+)):\s*(.+)$/);
    if (!entry) {
      continue;
    }

    const key = entry[1] ?? entry[2];
    const value = entry[3].trim().replace(/^["']|["']$/g, "");

    if (section === "catalog" && indent === 2) {
      catalogs.default[key] = value;
    } else if (section === "catalogs" && indent >= 4 && namedCatalog) {
      catalogs[namedCatalog][key] = value;
    }
  }

  return catalogs;
}
