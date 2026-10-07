import { z } from "zod";

import type { ViteUserConfig } from "vite-plus";

export const blockPackageJsonConfigSchema = z.object({
  name: z.string(),
});

export const glossaryMapEntrySchema = z.object({
  glossary: z.string(),
  adr: z.string().optional(),
  summary: z.string().optional(),
});

export const glossaryMapSchema = z.record(z.string(), glossaryMapEntrySchema);

export const blockAgentSkillsConfigSchema = z.object({
  glossaryMap: glossaryMapSchema.optional(),
});

export const blockGitHubActionsCIConfigSchema = z.object({
  emitRelease: z.boolean().optional(),
  auth: z.enum(["oidc", "token"]).optional(),
  npmEnvironment: z.string().optional(),
  release: z.enum(["direct", "changesets"]).optional(),
  repository: z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/)
    .optional(),
});

export const bingoConfigSchema = z.object({
  blockPackageJson: blockPackageJsonConfigSchema,
  blockAgentSkills: blockAgentSkillsConfigSchema.optional(),
  blockGitHubActionsCI: blockGitHubActionsCIConfigSchema.optional(),
});

export type BlockPackageJsonConfig = z.infer<typeof blockPackageJsonConfigSchema>;
export type BlockAgentSkillsConfig = z.infer<typeof blockAgentSkillsConfigSchema>;
export type BlockGitHubActionsCIConfig = z.infer<typeof blockGitHubActionsCIConfigSchema>;
export type BingoConfig = z.infer<typeof bingoConfigSchema>;
export type GlossaryMapEntry = z.infer<typeof glossaryMapEntrySchema>;

export type WorkspaceConfig = ViteUserConfig & {
  bingo: BingoConfig;
};
