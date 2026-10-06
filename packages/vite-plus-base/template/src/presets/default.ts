import { base } from "../base.ts";
import { blockAgentSkills } from "../blocks/blockAgentSkills/blockAgentSkills.ts";
import { blockGitHubActionsCI } from "../blocks/blockGitHubActionsCI/blockGitHubActionsCI.ts";
import { blockPackageJson } from "../blocks/blockPackageJson/blockPackageJson.ts";
import { blockRemoveFiles } from "../blocks/blockRemoveFiles/blockRemoveFiles.ts";
import { blockTypeScript } from "../blocks/blockTypeScript.ts";
import { blockVSCode } from "../blocks/blockVSCode.ts";

export const presetDefault = base.createPreset({
  about: {
    name: "Default",
  },
  blocks: [
    blockPackageJson,
    blockAgentSkills,
    blockGitHubActionsCI,
    blockTypeScript,
    blockVSCode,
    blockRemoveFiles,
  ],
});
