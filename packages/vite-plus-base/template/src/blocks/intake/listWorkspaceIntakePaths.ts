import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const GITHUB_WORKFLOW_PATHS = [
  ".github/workflows/ci.yaml",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yaml",
  ".github/workflows/release.yml",
  ".github/actions/prepare/action.yaml",
  ".github/actions/prepare/action.yml",
] as const;

function parsePnpmWorkspacePackages(yaml: string): string[] {
  const packages: string[] = [];
  let inPackages = false;

  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "packages:") {
      inPackages = true;
      continue;
    }

    if (!inPackages) {
      continue;
    }

    if (trimmed.startsWith("- ")) {
      packages.push(trimmed.slice(2).replace(/^['"]|['"]$/g, ""));
      continue;
    }

    if (trimmed && !line.startsWith(" ") && !line.startsWith("\t")) {
      break;
    }
  }

  return packages;
}

function readPackageJsonWorkspaces(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as {
      workspaces?: string[] | { packages?: string[] };
    };

    if (Array.isArray(parsed.workspaces)) {
      return parsed.workspaces;
    }

    if (parsed.workspaces && Array.isArray(parsed.workspaces.packages)) {
      return parsed.workspaces.packages;
    }
  } catch {
    return [];
  }

  return [];
}

async function expandPackageGlob(directory: string, pattern: string): Promise<string[]> {
  const normalizedPattern = pattern.replace(/\\/g, "/");

  if (normalizedPattern.endsWith("/*")) {
    const baseDir = path.join(directory, normalizedPattern.slice(0, -2));

    try {
      const entries = await readdir(baseDir, { withFileTypes: true });
      const results: string[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const relativePath = path
          .join(normalizedPattern.slice(0, -2), entry.name, "package.json")
          .replace(/\\/g, "/");

        try {
          await access(path.join(directory, relativePath));
          results.push(relativePath);
        } catch {
          // skip missing package.json
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  const relativePath = normalizedPattern.endsWith("/package.json")
    ? normalizedPattern
    : path.join(normalizedPattern, "package.json").replace(/\\/g, "/");

  try {
    await access(path.join(directory, relativePath));
    return [relativePath];
  } catch {
    return [];
  }
}

async function listWorkspacePackageJsonPaths(directory: string): Promise<string[]> {
  let globs: string[] = [];

  try {
    const content = await readFile(path.join(directory, "pnpm-workspace.yaml"), "utf8");
    globs = parsePnpmWorkspacePackages(content);
  } catch {
    try {
      const packageJson = await readFile(path.join(directory, "package.json"), "utf8");
      globs = readPackageJsonWorkspaces(packageJson);
    } catch {
      return [];
    }
  }

  const paths: string[] = [];

  for (const pattern of globs) {
    paths.push(...(await expandPackageGlob(directory, pattern)));
  }

  return paths;
}

export async function listExtraTransitionIntakePaths(directory: string): Promise<string[]> {
  const paths: string[] = [];

  try {
    await access(path.join(directory, "pnpm-workspace.yaml"));
    paths.push("pnpm-workspace.yaml");
  } catch {
    // no workspace file
  }

  try {
    await access(path.join(directory, "renovate.json"));
    paths.push("renovate.json");
  } catch {
    // no renovate config
  }

  for (const packageJsonPath of await listWorkspacePackageJsonPaths(directory)) {
    paths.push(packageJsonPath);
  }

  for (const workflowPath of GITHUB_WORKFLOW_PATHS) {
    try {
      await access(path.join(directory, workflowPath));
      paths.push(workflowPath);
    } catch {
      // workflow not present
    }
  }

  return paths;
}
