import { defineConfig as vpDefineConfig, type ViteUserConfig } from "vite-plus";

import { mergeConfig } from "./merge-config.ts";
import { libraryDefaults, sharedDefaults, workspaceDefaults } from "./presets.ts";
import type { WorkspaceConfig } from "./workspace-config.ts";

export { defineProject } from "vite-plus";
export type { LintPreset } from "./overrides.ts";
export { defineLintPreset, fmtOverride, lintOverride } from "./overrides.ts";
export { mergeConfig } from "./merge-config.ts";
export { libraryDefaults, sharedDefaults, workspaceDefaults } from "./presets.ts";
export {
  bingoConfigSchema,
  blockAgentSkillsConfigSchema,
  blockPackageJsonConfigSchema,
  blockReactConfigSchema,
  glossaryMapEntrySchema,
  glossaryMapSchema,
} from "./workspace-config.ts";
export type {
  BingoConfig,
  BlockAgentSkillsConfig,
  BlockPackageJsonConfig,
  BlockReactConfig,
  GlossaryMapEntry,
  WorkspaceConfig,
} from "./workspace-config.ts";

export function defineConfig(config: ViteUserConfig = {}) {
  return vpDefineConfig(mergeConfig(sharedDefaults, config));
}

export function defineWorkspaceConfig({ bingo: _bingo, ...config }: WorkspaceConfig) {
  return vpDefineConfig(mergeConfig(workspaceDefaults, config));
}

export function defineLibraryConfig(config: ViteUserConfig = {}) {
  return vpDefineConfig(mergeConfig(libraryDefaults, config));
}

export { vpDefineConfig as defineVitePlusConfig };
