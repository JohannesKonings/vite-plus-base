import { createSoloWorkflowFile } from "../../files/createSoloWorkflowFile.ts";
import type { PackageManifest } from "../detectPublishablePackages.ts";
import type { WorkspaceShape } from "../../intake/detectWorkspaceShape.ts";
import { resolveUses } from "../actions/resolveUses.ts";
import { DEFAULT_BRANCH } from "../constants.ts";

function verificationSteps(workspaceShape: WorkspaceShape) {
  const testCommand = workspaceShape === "package-workspace" ? "vp run -r test" : "vp test";
  const buildCommand = workspaceShape === "package-workspace" ? "vp run -r build" : "vp build";

  return [
    { uses: resolveUses("actions/checkout", "v7") },
    { uses: "./.github/actions/prepare" },
    { run: "vp install --frozen-lockfile" },
    { run: "vp check" },
    { run: testCommand },
    { run: buildCommand },
  ];
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

export function createReleaseWorkflow({
  workspaceShape,
  publishablePackages,
  npmEnvironment,
}: {
  workspaceShape: WorkspaceShape;
  publishablePackages: PackageManifest[];
  npmEnvironment?: string;
}) {
  const publishSteps = publishablePackages.map((pkg) => createPublishStep(pkg));

  return createSoloWorkflowFile({
    name: "Release",
    on: { push: { branches: [DEFAULT_BRANCH] } },
    concurrency: { group: "${{ github.workflow }}" },
    permissions: {
      contents: "read",
      "id-token": "write",
    },
    environment: npmEnvironment,
    steps: [...verificationSteps(workspaceShape), ...publishSteps],
  });
}
