/**
 * PROTOTYPE — CI workflow (#4): one Check job, PR + push main, concurrency on PR only.
 */
import { createMultiWorkflowFile } from "../../files/createMultiWorkflowFile.ts";
import type { WorkspaceShape } from "../detectWorkspaceShape.ts";

function verificationSteps(workspaceShape: WorkspaceShape) {
  const testCommand = workspaceShape === "package-workspace" ? "vp run -r test" : "vp test";
  const buildCommand = workspaceShape === "package-workspace" ? "vp run -r build" : "vp build";

  return [
    { run: "vp install --frozen-lockfile" },
    { run: "vp check" },
    { run: testCommand },
    { run: buildCommand },
  ];
}

export function createCiWorkflow({
  workspaceShape,
  extraJobs = [],
}: {
  workspaceShape: WorkspaceShape;
  extraJobs?: Parameters<typeof createMultiWorkflowFile>[0]["jobs"];
}) {
  const jobs = [
    {
      name: "Check",
      steps: verificationSteps(workspaceShape),
    },
    ...extraJobs,
  ].toSorted((a, b) => a.name.localeCompare(b.name));

  return createMultiWorkflowFile({
    name: "CI",
    concurrency: {
      group: "${{ github.workflow }}-${{ github.ref }}",
      "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
    },
    permissions: { contents: "read" },
    jobs,
  });
}
