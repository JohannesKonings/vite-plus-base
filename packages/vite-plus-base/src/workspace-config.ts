import { z } from "zod";

import type { ViteUserConfig } from "vite-plus";

export const blockPackageJsonConfigSchema = z.object({
  name: z.string(),
});

export const bingoConfigSchema = z.object({
  blockPackageJson: blockPackageJsonConfigSchema,
});

export type BlockPackageJsonConfig = z.infer<typeof blockPackageJsonConfigSchema>;
export type BingoConfig = z.infer<typeof bingoConfigSchema>;

export type WorkspaceConfig = ViteUserConfig & {
  bingo: BingoConfig;
};
