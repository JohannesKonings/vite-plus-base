import { defineWorkspaceConfig } from "./packages/vite-plus-base/src/index.ts";

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {
      name: "vite-plus-base",
    },
    blockGitHubActionsCI: {
      release: "changesets",
      repository: "JohannesKonings/vite-plus-base",
    },
    blockAgentSkills: {
      glossaryMap: {
        root: {
          glossary: "GLOSSARY.md",
          adr: "docs/adr",
        },
        "packages/vite-plus-base": {
          glossary: "packages/vite-plus-base/GLOSSARY.md",
          adr: "packages/vite-plus-base/docs/adr",
        },
      },
    },
  },
});
