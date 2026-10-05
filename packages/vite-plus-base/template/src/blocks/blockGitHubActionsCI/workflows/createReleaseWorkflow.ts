/**
 * PROTOTYPE — release workflow (#6): publish committed versions on push to main.
 * Reuses same verification steps as CI, then publishes each publishable package.
 */
import { createSoloWorkflowFile } from "../../files/createSoloWorkflowFile.ts";
import type { PackageManifest } from "../detectPublishablePackages.ts";
import type { WorkspaceShape } from "../detectWorkspaceShape.ts";
import { DEFAULT_BRANCH } from "../constants.ts";

function verificationSteps(workspaceShape: WorkspaceShape) {
  const testCommand = workspaceShape === "package-workspace" ? "vp run -r test" : "vp test";
  const buildCommand = workspaceShape === "package-workspace" ? "vp run -r build" : "vp build";

  return [
    { uses: "actions/checkout@v4" },
    { uses: "./.github/actions/prepare" },
    { run: "vp install --frozen-lockfile" },
    { run: "vp check" },
    { run: testCommand },
    { run: buildCommand },
  ];
}

export function createReleaseWorkflow({
  workspaceShape,
  publishablePackages,
}: {
  workspaceShape: WorkspaceShape;
  publishablePackages: PackageManifest[];
}) {
  // TODO: emit per-package publish steps with skip-if-already-on-registry guard (#6)
  const publishSteps = publishablePackages.map((pkg) => ({
    name: `Publish ${pkg.name ?? pkg.path}`,
    run: `# pnpm publish from ${pkg.path} — auth TBD in #10`,
  }));

  return createSoloWorkflowFile({
    name: "Release",
    on: { push: { branches: [DEFAULT_BRANCH] } },
    concurrency: { group: "${{ github.workflow }}" },
    permissions: {
      contents: "read",
      "id-token": "write", // npm OIDC — details in #10
    },
    steps: [...verificationSteps(workspaceShape), ...publishSteps],
  });
}
