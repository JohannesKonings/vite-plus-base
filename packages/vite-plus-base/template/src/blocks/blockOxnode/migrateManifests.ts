import { hasTsxCommand, rewritePackageScripts, rewriteTsxCommand } from "./rewriteTsxCommand.ts";

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies"] as const;

type JsonRecord = Record<string, unknown>;

export type ManifestMigration = {
  text: string;
  changed: boolean;
  manual: string[];
  stillNeedsTsx: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function formatJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function dependencyRecord(manifest: JsonRecord, field: (typeof DEPENDENCY_FIELDS)[number]) {
  const value = manifest[field];
  return isRecord(value) ? (value as Record<string, string>) : undefined;
}

function removeNamedDependency(manifest: JsonRecord, name: string) {
  let removed = false;

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = dependencyRecord(manifest, field);
    if (!dependencies || !(name in dependencies)) {
      continue;
    }

    const next = { ...dependencies };
    delete next[name];
    if (Object.keys(next).length === 0) {
      delete manifest[field];
    } else {
      manifest[field] = next;
    }
    removed = true;
  }

  return removed;
}

function addMissingDevDependencies(
  manifest: JsonRecord,
  additions: Record<string, string> | undefined,
) {
  if (!additions || Object.keys(additions).length === 0) {
    return false;
  }

  const devDependencies = { ...dependencyRecord(manifest, "devDependencies") };
  let added = false;

  for (const [name, version] of Object.entries(additions)) {
    if (devDependencies[name]) {
      continue;
    }

    devDependencies[name] = version;
    added = true;
  }

  if (added) {
    manifest.devDependencies = devDependencies;
  }

  return added;
}

export function migratePackageManifest(
  raw: string,
  runnerVersions: Record<string, string>,
  options?: {
    extraDevDependencies?: Record<string, string>;
    forceRunner?: boolean;
    keepTsx?: boolean;
  },
): ManifestMigration {
  const manifest = JSON.parse(raw) as JsonRecord;
  const rewrittenScripts = rewritePackageScripts(
    isRecord(manifest.scripts) ? manifest.scripts : undefined,
  );
  const manual = [...rewrittenScripts.manual];

  if (rewrittenScripts.scripts && rewrittenScripts.changed) {
    manifest.scripts = rewrittenScripts.scripts;
  }

  const stillNeedsTsx = rewrittenScripts.stillNeedsTsx || options?.keepTsx === true;
  const removedTsx = stillNeedsTsx ? false : removeNamedDependency(manifest, "tsx");
  const addedRunner =
    rewrittenScripts.changed || removedTsx || options?.forceRunner
      ? addMissingDevDependencies(manifest, runnerVersions)
      : false;
  const addedExtra = addMissingDevDependencies(manifest, options?.extraDevDependencies);
  const changed = rewrittenScripts.changed || removedTsx || addedRunner || addedExtra;

  return {
    text: changed ? formatJson(manifest) : raw,
    changed,
    manual,
    stillNeedsTsx,
  };
}

function rewriteJsonStrings(
  value: unknown,
  manual: string[],
  path: string,
): { value: unknown; changed: boolean } {
  if (typeof value === "string") {
    const rewritten = rewriteTsxCommand(value);
    for (const reason of rewritten.manual) {
      manual.push(`${path}: ${reason}`);
    }
    return { value: rewritten.text, changed: rewritten.text !== value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item, index) => {
      const rewritten = rewriteJsonStrings(item, manual, `${path}[${index}]`);
      changed = changed || rewritten.changed;
      return rewritten.value;
    });
    return { value: next, changed };
  }

  if (isRecord(value)) {
    let changed = false;
    const next: JsonRecord = {};
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      const rewritten = rewriteJsonStrings(child, manual, childPath);
      next[key] = rewritten.value;
      changed = changed || rewritten.changed;
    }
    return { value: next, changed };
  }

  return { value, changed: false };
}

export function migrateCdkJson(raw: string, label = "cdk.json"): ManifestMigration {
  const parsed = JSON.parse(raw) as unknown;
  const manual: string[] = [];
  const rewritten = rewriteJsonStrings(parsed, manual, label);
  const stillNeedsTsx = hasTsxCommand(JSON.stringify(rewritten.value));

  return {
    text: rewritten.changed ? formatJson(rewritten.value) : raw,
    changed: rewritten.changed,
    manual,
    stillNeedsTsx,
  };
}

export function scriptReplacements(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const replacements: Record<string, string> = {};

  for (const [name, command] of Object.entries(after)) {
    if (typeof command !== "string" || before[name] === command) {
      continue;
    }
    replacements[name] = command;
  }

  return replacements;
}
