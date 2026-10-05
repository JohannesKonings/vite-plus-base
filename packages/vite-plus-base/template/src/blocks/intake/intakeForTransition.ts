import { execFile } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type IntakeFileEntry = [string] | [string, { executable?: boolean }];

interface IntakeDirectory {
  [key: string]: IntakeDirectory | IntakeFileEntry | undefined;
}

const TRANSITION_INTAKE_PATHS = [
  "package.json",
  "vite.config.ts",
  "AGENTS.md",
  "GLOSSARY-MAP.md",
  "docs/agents/issue-tracker.md",
  "docs/agents/triage-labels.md",
  "docs/agents/domain.md",
  ".vscode/settings.json",
  ".vscode/extensions.json",
] as const;

function isModeExecutable(mode: number) {
  return (mode & 0o1) !== 0;
}

async function readIntakeFile(filePath: string): Promise<IntakeFileEntry> {
  const fileStats = await stat(filePath);
  const contents = (await readFile(filePath)).toString();

  if (process.platform === "win32") {
    return [contents];
  }

  return [contents, { executable: isModeExecutable(fileStats.mode) }];
}

function setNestedFile(root: IntakeDirectory, relativePath: string, fileEntry: IntakeFileEntry) {
  const segments = relativePath.split("/");
  let current = root;

  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    const child = current[segment];

    if (child === undefined || Array.isArray(child)) {
      const directory: IntakeDirectory = {};
      current[segment] = directory;
      current = directory;
      continue;
    }

    current = child;
  }

  current[segments.at(-1)!] = fileEntry;
}

async function isGitIgnored(directory: string, relativePath: string) {
  try {
    await execFileAsync("git", ["check-ignore", "-q", "--", relativePath], { cwd: directory });
    return true;
  } catch {
    return false;
  }
}

async function listTransitionPaths(directory: string) {
  const paths: string[] = [];

  for (const relativePath of TRANSITION_INTAKE_PATHS) {
    try {
      await access(path.join(directory, relativePath));
    } catch {
      continue;
    }

    if (await isGitIgnored(directory, relativePath)) {
      continue;
    }

    paths.push(relativePath);
  }

  return paths;
}

export async function intakeForTransition(directory = "."): Promise<IntakeDirectory> {
  const absoluteDirectory = path.resolve(directory);
  const files: IntakeDirectory = {};

  for (const relativePath of await listTransitionPaths(absoluteDirectory)) {
    setNestedFile(
      files,
      relativePath,
      await readIntakeFile(path.join(absoluteDirectory, relativePath)),
    );
  }

  return files;
}
