import { readFileSync } from "node:fs";

import { describe, expect, it } from "vite-plus/test";

import {
  CHANGESETS_CHANGELOG_GITHUB_VERSION,
  CHANGESETS_CLI_VERSION,
  createChangesetConfig,
  createChangesetScripts,
} from "../template/src/blocks/blockGitHubActionsCI/changesets.ts";
import { createCiReleaseDoc } from "../template/src/blocks/blockGitHubActionsCI/docs/createCiReleaseDoc.ts";
import {
  readGitHubRepository,
  readWorkspaceGitHubRepository,
} from "../template/src/blocks/blockGitHubActionsCI/detectPublishablePackages.ts";
import { createReleaseWorkflow } from "../template/src/blocks/blockGitHubActionsCI/workflows/createReleaseWorkflow.ts";

const repoRoot = new URL("../../../", import.meta.url);

function readRepoFile(path: string) {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

describe("Changesets release helpers", () => {
  it("reads GitHub repositories from package.json repository fields", () => {
    expect(readGitHubRepository("https://github.com/JohannesKonings/vite-plus-base")).toBe(
      "JohannesKonings/vite-plus-base",
    );
    expect(
      readGitHubRepository({
        type: "git",
        url: "git+https://github.com/JohannesKonings/vite-plus-base.git",
      }),
    ).toBe("JohannesKonings/vite-plus-base");
    expect(readGitHubRepository("git@github.com:acme/app.git")).toBe("acme/app");
    expect(readGitHubRepository("https://gitlab.com/acme/app")).toBeUndefined();
  });

  it("prefers the root package repository", () => {
    expect(
      readWorkspaceGitHubRepository({
        "package.json": JSON.stringify({
          name: "root",
          private: true,
          repository: "https://github.com/acme/root",
        }),
        packages: {
          lib: {
            "package.json": JSON.stringify({
              name: "@acme/lib",
              repository: "https://github.com/acme/lib",
            }),
          },
        },
      }),
    ).toBe("acme/root");
  });

  it("matches this repo's Changesets release files", () => {
    const workflow = createReleaseWorkflow({
      workspaceShape: "package-workspace",
      publishablePackages: [
        { path: "packages/vite-plus-base", name: "@jaykingson/vite-plus-base" },
      ],
      release: "changesets",
      lintPackage: true,
    });
    const scripts = createChangesetScripts({
      workspaceShape: "package-workspace",
      lintPackage: true,
    });
    const rootPackage = JSON.parse(readRepoFile("package.json")) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(readRepoFile(".github/workflows/release.yaml")).toBe(workflow);
    expect(readRepoFile(".changeset/config.json")).toBe(
      createChangesetConfig("JohannesKonings/vite-plus-base"),
    );
    expect(readRepoFile("docs/agents/ci-release.md")).toBe(createCiReleaseDoc("changesets"));
    expect(rootPackage.scripts.changeset).toBe(scripts.changeset);
    expect(rootPackage.scripts["version-packages"]).toBe(scripts["version-packages"]);
    expect(rootPackage.scripts.release).toBe(scripts.release);
    expect(rootPackage.devDependencies["@changesets/cli"]).toBe(CHANGESETS_CLI_VERSION);
    expect(rootPackage.devDependencies["@changesets/changelog-github"]).toBe(
      CHANGESETS_CHANGELOG_GITHUB_VERSION,
    );
  });
});
