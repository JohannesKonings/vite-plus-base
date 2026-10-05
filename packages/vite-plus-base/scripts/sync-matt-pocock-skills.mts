import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PINNED_REF = "4588b32ecab9ecc9fc8cc6b6c5e7d675b6004b0d";
const SKILL_CATEGORIES = ["engineering", "productivity", "misc", "in-progress", "deprecated"];
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDirectory, "..");
const vendoredDirectory = path.join(packageRoot, "template/src/blocks/blockAgentSkills/vendored");
const skillsLockPath = path.join(packageRoot, "skills-lock.json");

function runGit(args: string[], cwd: string) {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

function copySkillTree(sourceRoot: string, category: string, skillName: string) {
  const sourceDirectory = path.join(sourceRoot, "skills", category, skillName);
  const targetDirectory = path.join(vendoredDirectory, skillName);

  fs.rmSync(targetDirectory, { recursive: true, force: true });
  fs.cpSync(sourceDirectory, targetDirectory, { recursive: true });
}

function main() {
  const temporaryDirectory = fs.mkdtempSync(path.join(packageRoot, ".tmp-sync-skills-"));

  try {
    runGit(
      ["clone", "--depth", "1", "https://github.com/mattpocock/skills.git", temporaryDirectory],
      packageRoot,
    );
    runGit(["fetch", "--depth", "1", "origin", PINNED_REF], temporaryDirectory);
    runGit(["checkout", PINNED_REF], temporaryDirectory);

    fs.rmSync(vendoredDirectory, { recursive: true, force: true });
    fs.mkdirSync(vendoredDirectory, { recursive: true });

    const manifest: string[] = [];

    for (const category of SKILL_CATEGORIES) {
      const categoryDirectory = path.join(temporaryDirectory, "skills", category);
      if (!fs.existsSync(categoryDirectory)) {
        continue;
      }

      for (const entry of fs.readdirSync(categoryDirectory, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillDirectory = path.join(categoryDirectory, entry.name);
        if (!fs.existsSync(path.join(skillDirectory, "SKILL.md"))) {
          continue;
        }

        copySkillTree(temporaryDirectory, category, entry.name);

        for (const relativePath of walkFiles(path.join(vendoredDirectory, entry.name))) {
          manifest.push(path.join(entry.name, relativePath));
        }
      }
    }

    manifest.sort();
    fs.writeFileSync(
      path.join(vendoredDirectory, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    fs.writeFileSync(
      skillsLockPath,
      `${JSON.stringify({ ref: PINNED_REF, syncedAt: new Date().toISOString().slice(0, 10) }, null, 2)}\n`,
    );
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function walkFiles(directory: string, prefix = ""): string[] {
  const paths: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...walkFiles(absolutePath, relativePath));
      continue;
    }

    paths.push(relativePath);
  }

  return paths;
}

main();
