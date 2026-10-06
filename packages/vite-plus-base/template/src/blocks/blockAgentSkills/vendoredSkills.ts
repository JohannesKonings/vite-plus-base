import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(require.resolve("@jaykingson/vite-plus-base/package.json"));
const vendoredDirectory = path.join(packageRoot, "template/src/blocks/blockAgentSkills/vendored");

interface NestedFiles {
  [key: string]: string | NestedFiles;
}

function setNestedFile(tree: NestedFiles, segments: string[], content: string) {
  let current: NestedFiles = tree;

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    const next = current[segment];

    if (!next || typeof next === "string") {
      current[segment] = {};
    }

    current = current[segment] as NestedFiles;
  }

  current[segments.at(-1)!] = content;
}

export function vendoredSkillFiles() {
  const manifestPath = path.join(vendoredDirectory, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as string[];
  const skills: NestedFiles = {};

  for (const relativePath of manifest) {
    if (relativePath === "manifest.json") {
      continue;
    }

    const content = fs.readFileSync(path.join(vendoredDirectory, relativePath), "utf8");
    setNestedFile(skills, relativePath.split("/"), content);
  }

  return {
    ".agents": {
      skills,
    },
  };
}
