import type { ViteUserConfig } from "vite-plus";

export type WorkspaceConfig = ViteUserConfig & {
  name: string;
};
