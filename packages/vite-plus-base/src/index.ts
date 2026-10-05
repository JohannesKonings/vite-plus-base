import { defineConfig as vpDefineConfig } from "vite-plus";
import type { UserConfig } from "vite";

import { mergeConfig } from "./merge-config.ts";
import { libraryDefaults, sharedDefaults, workspaceDefaults } from "./presets.ts";
import type { WorkspaceConfig } from "./workspace-config.ts";

export { defineProject } from "vite-plus";
export type { LintPreset } from "./overrides.ts";
export { defineLintPreset, fmtOverride, lintOverride } from "./overrides.ts";
export { mergeConfig } from "./merge-config.ts";
export { libraryDefaults, sharedDefaults, workspaceDefaults } from "./presets.ts";
export type { WorkspaceConfig } from "./workspace-config.ts";

export function defineConfig(config: UserConfig = {}) {
  return vpDefineConfig(mergeConfig(sharedDefaults, config));
}

export function defineWorkspaceConfig({ name: _name, ...config }: WorkspaceConfig) {
  return vpDefineConfig(mergeConfig(workspaceDefaults, config));
}

export function defineLibraryConfig(config: UserConfig = {}) {
  return vpDefineConfig(mergeConfig(libraryDefaults, config));
}

export { vpDefineConfig as defineVitePlusConfig };
