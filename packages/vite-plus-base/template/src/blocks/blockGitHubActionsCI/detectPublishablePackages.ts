import { intakeFile } from "../intake/intakeFile.ts";

export interface PackageManifest {
  path: string;
  name?: string;
  private?: boolean;
  exports?: unknown;
  files?: unknown;
  bin?: unknown;
  scripts?: { build?: string; prepublishOnly?: string };
}

interface RawPackageManifest {
  name?: string;
  private?: boolean;
  exports?: unknown;
  files?: unknown;
  bin?: unknown;
  scripts?: { build?: string; prepublishOnly?: string };
}

function isPublishable(manifest: RawPackageManifest): boolean {
  if (manifest.private === true) {
    return false;
  }

  const hasPublishSurface =
    manifest.exports != null || manifest.files != null || manifest.bin != null;
  const hasBuildScript =
    manifest.scripts?.build != null || manifest.scripts?.prepublishOnly != null;

  return hasPublishSurface && hasBuildScript;
}

function collectPackageManifests(
  files: Record<string, unknown>,
): Array<{ path: string; manifest: RawPackageManifest }> {
  const results: Array<{ path: string; manifest: RawPackageManifest }> = [];
  const seen = new Set<string>();

  function addManifest(relativePath: string, content: string) {
    const directory =
      relativePath === "package.json" ? "." : relativePath.replace(/\/package\.json$/, "");

    if (seen.has(directory)) {
      return;
    }

    try {
      const manifest = JSON.parse(content) as RawPackageManifest;
      seen.add(directory);
      results.push({ path: directory, manifest });
    } catch {
      // skip invalid package.json
    }
  }

  function walk(node: unknown, prefix: string) {
    if (typeof node === "string" && prefix.endsWith("package.json")) {
      addManifest(prefix, node);
      return;
    }

    if (Array.isArray(node) && typeof node[0] === "string" && prefix.endsWith("package.json")) {
      addManifest(prefix, node[0]);
      return;
    }

    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const nextPath = prefix ? `${prefix}/${key}` : key;

      if (key === "package.json") {
        if (typeof value === "string") {
          addManifest(nextPath, value);
        } else if (Array.isArray(value) && typeof value[0] === "string") {
          addManifest(nextPath, value[0]);
        }
        continue;
      }

      if (value && typeof value === "object") {
        walk(value, nextPath);
      }
    }
  }

  walk(files, "");

  const rootPackageJson = intakeFile(files, ["package.json"]);
  if (rootPackageJson) {
    addManifest("package.json", rootPackageJson[0]);
  }

  return results;
}

export function detectPublishablePackages(files: Record<string, unknown>): PackageManifest[] {
  return collectPackageManifests(files)
    .filter(({ manifest }) => isPublishable(manifest))
    .map(({ path, manifest }) => ({
      path,
      name: manifest.name,
      private: manifest.private,
      exports: manifest.exports,
      files: manifest.files,
      bin: manifest.bin,
      scripts: manifest.scripts,
    }));
}
