import { base } from "../base.ts";
import { dependencyCruiserSkill } from "./contents/dependencyCruiserConfig.ts";

export const DEPENDENCY_CRUISER_SKILL_PATH = ".cursor/skills/dependency-cruiser/SKILL.md";

function dependencyCruiserSkillFiles() {
  return {
    ".cursor": {
      skills: {
        "dependency-cruiser": {
          "SKILL.md": dependencyCruiserSkill,
        },
      },
    },
  };
}

export const blockAgentSkills = base.createBlock({
  about: {
    name: "Agent Skills",
  },
  produce() {
    return {
      files: dependencyCruiserSkillFiles(),
      suggestions: ["Agent skill for dependency-cruiser was added."],
    };
  },
  transition() {
    return {
      files: dependencyCruiserSkillFiles(),
      suggestions: ["Agent skill for dependency-cruiser was refreshed."],
    };
  },
});
