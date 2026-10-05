import { base } from "../base.ts";
import { blockAgentSkills } from "../blocks/blockAgentSkills.ts";
import { blockDependencyCruiser } from "../blocks/blockDependencyCruiser.ts";
import { blockPackageJson } from "../blocks/blockPackageJson.ts";
import { blockRemoveFiles } from "../blocks/blockRemoveFiles.ts";
import { blockTypeScript } from "../blocks/blockTypeScript.ts";
import { blockVSCode } from "../blocks/blockVSCode.ts";

export const presetDefault = base.createPreset({
  about: {
    name: "Default",
  },
  blocks: [
    blockPackageJson,
    blockDependencyCruiser,
    blockAgentSkills,
    blockTypeScript,
    blockVSCode,
    blockRemoveFiles,
  ],
});
