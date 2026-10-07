import type { WorkspaceShape } from "../intake/detectWorkspaceShape.ts";

export const CHANGESETS_CLI_VERSION = "^3.0.3";
export const CHANGESETS_CHANGELOG_GITHUB_VERSION = "^1.0.1";
export const CHANGESETS_ACTION_USES = "changesets/action@v2";
export const CHANGESETS_CONFIG_SCHEMA = "https://unpkg.com/@changesets/config@4.0.1/schema.json";
export const VERSION_PACKAGES_TITLE = "Version Packages";
export const UNCONFIGURED_GITHUB_REPOSITORY = "OWNER/REPO";

export function createChangesetScripts({
  workspaceShape,
  lintPackage,
}: {
  workspaceShape: WorkspaceShape;
  lintPackage: boolean;
}): Record<string, string> {
  const build = workspaceShape === "package-workspace" ? "vp run -r build" : "vp build";
  const lint =
    workspaceShape === "package-workspace" ? "vp run -r lint:package" : "vp lint:package";
  const release = [build, ...(lintPackage ? [lint] : []), "changeset publish"].join(" && ");

  return {
    changeset: "changeset",
    "version-packages": "changeset version && vp install",
    release,
  };
}

export function createChangesetConfig(repository: string): string {
  return `${JSON.stringify(
    {
      $schema: CHANGESETS_CONFIG_SCHEMA,
      changelog: ["@changesets/changelog-github", { repo: repository }],
      commit: false,
      access: "public",
      baseBranch: "main",
      updateInternalDependencies: "patch",
      privatePackages: {
        version: false,
        tag: false,
      },
      fixed: [],
      linked: [],
      ignore: [],
    },
    null,
    2,
  )}\n`;
}
