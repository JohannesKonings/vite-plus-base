import { createSoloWorkflowFile } from "../../files/createSoloWorkflowFile.ts";
import type { WorkspaceShape } from "../../intake/detectWorkspaceShape.ts";
import { resolveUses } from "../actions/resolveUses.ts";
import { CHANGESETS_ACTION_USES, VERSION_PACKAGES_TITLE } from "../changesets.ts";
import { DEFAULT_BRANCH } from "../constants.ts";
import type { PackageManifest } from "../detectPublishablePackages.ts";

function commandPrefix(workspaceShape: WorkspaceShape) {
  return workspaceShape === "package-workspace" ? "vp run -r " : "vp ";
}

function checkoutStep(release: "direct" | "changesets") {
  if (release === "changesets") {
    return {
      uses: resolveUses("actions/checkout", "v7"),
      with: { "fetch-depth": 0 },
    };
  }

  return { uses: resolveUses("actions/checkout", "v7") };
}

function verificationSteps({
  workspaceShape,
  lintPackage,
  release,
}: {
  workspaceShape: WorkspaceShape;
  lintPackage: boolean;
  release: "direct" | "changesets";
}) {
  const prefix = commandPrefix(workspaceShape);
  const steps: Array<Record<string, unknown>> = [
    checkoutStep(release),
    { uses: "./.github/actions/prepare" },
    { run: "vp install --frozen-lockfile" },
    { run: "vp check" },
    { run: `${prefix}test` },
    { run: `${prefix}build` },
  ];

  if (lintPackage) {
    steps.push({ run: `${prefix}lint:package` });
  }

  return steps;
}

function createPublishStep(pkg: PackageManifest) {
  const packageName = pkg.name ?? pkg.path;
  const script = [
    "VERSION=$(node -p \"require('./package.json').version\")",
    `if pnpm view "${packageName}@\${VERSION}" version 2>/dev/null; then`,
    '  echo "Already published, skipping"',
    "else",
    "  pnpm publish --no-git-checks --access public",
    "fi",
  ].join("\n");

  const step: Record<string, string> = {
    name: `Publish ${packageName}`,
    run: script,
  };

  if (pkg.path !== ".") {
    step["working-directory"] = pkg.path;
  }

  return step;
}

function createChangesetsStep() {
  return {
    name: "Create Release Pull Request or Publish",
    id: "changesets",
    uses: CHANGESETS_ACTION_USES,
    with: {
      "version-script": "vp run version-packages",
      "publish-script": "vp run release",
      "commit-message": VERSION_PACKAGES_TITLE,
      "pr-title": VERSION_PACKAGES_TITLE,
      "create-github-releases": true,
    },
  };
}

export function createReleaseWorkflow({
  workspaceShape,
  publishablePackages,
  npmEnvironment,
  release = "direct",
  lintPackage = false,
}: {
  workspaceShape: WorkspaceShape;
  publishablePackages: PackageManifest[];
  npmEnvironment?: string;
  release?: "direct" | "changesets";
  lintPackage?: boolean;
}) {
  const publishSteps =
    release === "changesets"
      ? [createChangesetsStep()]
      : publishablePackages.map((pkg) => createPublishStep(pkg));

  return createSoloWorkflowFile({
    name: "Release",
    on: { push: { branches: [DEFAULT_BRANCH] } },
    concurrency: { group: "${{ github.workflow }}" },
    permissions:
      release === "changesets"
        ? {
            contents: "write",
            "pull-requests": "write",
            "id-token": "write",
          }
        : {
            contents: "read",
            "id-token": "write",
          },
    environment: npmEnvironment,
    steps: [...verificationSteps({ workspaceShape, lintPackage, release }), ...publishSteps],
  });
}
