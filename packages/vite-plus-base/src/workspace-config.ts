import type { UserConfig } from "vite";

export type WorkspaceConfig = UserConfig & {
  name: string;
};
