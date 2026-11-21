import { z } from "zod";

import type { ViteUserConfig } from "vite-plus";

export const blockPackageJsonConfigSchema: z.ZodObject<{
  name: z.ZodString;
}> = z.object({
  name: z.string(),
});

export const glossaryMapEntrySchema: z.ZodObject<{
  glossary: z.ZodString;
  adr: z.ZodOptional<z.ZodString>;
  summary: z.ZodOptional<z.ZodString>;
}> = z.object({
  glossary: z.string(),
  adr: z.string().optional(),
  summary: z.string().optional(),
});

export const glossaryMapSchema: z.ZodRecord<z.ZodString, typeof glossaryMapEntrySchema> = z.record(
  z.string(),
  glossaryMapEntrySchema,
);

export const blockAgentSkillsConfigSchema: z.ZodObject<{
  glossaryMap: z.ZodOptional<typeof glossaryMapSchema>;
}> = z.object({
  glossaryMap: glossaryMapSchema.optional(),
});

export const blockGitHubActionsCIConfigSchema: z.ZodObject<{
  emitRelease: z.ZodOptional<z.ZodBoolean>;
  auth: z.ZodOptional<z.ZodEnum<{ oidc: "oidc"; token: "token" }>>;
  npmEnvironment: z.ZodOptional<z.ZodString>;
}> = z.object({
  emitRelease: z.boolean().optional(),
  auth: z.enum(["oidc", "token"]).optional(),
  npmEnvironment: z.string().optional(),
});

export const bingoConfigSchema: z.ZodObject<{
  blockPackageJson: typeof blockPackageJsonConfigSchema;
  blockAgentSkills: z.ZodOptional<typeof blockAgentSkillsConfigSchema>;
  blockGitHubActionsCI: z.ZodOptional<typeof blockGitHubActionsCIConfigSchema>;
}> = z.object({
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
