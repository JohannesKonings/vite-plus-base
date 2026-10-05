import type { UserConfig } from "vite";

type LintConfig = NonNullable<UserConfig["lint"]>;
type LintOverrideEntry = NonNullable<LintConfig["overrides"]>[number];
export type LintPreset = Omit<LintOverrideEntry, "files">;

type FmtConfig = NonNullable<UserConfig["fmt"]>;
type FmtOverrideEntry = NonNullable<FmtConfig["overrides"]>[number];

function normalizeFiles(files: string | string[]): string[] {
  return Array.isArray(files) ? files : [files];
}

/** Package- or path-specific lint rules for the root `vite.config.ts`. */
export function lintOverride(files: string | string[], config: LintPreset): LintOverrideEntry {
  return {
    files: normalizeFiles(files),
    ...config,
  };
}

/** Reusable lint settings without `files`, for composing overrides. */
export function defineLintPreset(config: LintPreset): LintPreset {
  return config;
}

/** Package- or path-specific format options for the root `vite.config.ts`. */
export function fmtOverride(
  files: string | string[],
  options: NonNullable<FmtOverrideEntry["options"]>,
): FmtOverrideEntry {
  return {
    files: normalizeFiles(files),
    options,
  };
}
