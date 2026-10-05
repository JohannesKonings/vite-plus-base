import { defineWorkspaceConfig } from "./packages/vite-plus-base/src/index.ts";

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {
      name: "vite-plus-base",
    },
  },
});
