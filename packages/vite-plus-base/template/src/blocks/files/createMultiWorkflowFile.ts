/**
 * PROTOTYPE — vendored/adapted from CTA createMultiWorkflowFile.
 * Adds concurrency + permissions to the generated workflow root.
 */
import { createJobName } from "./createJobName.ts";
import { formatWorkflowYaml } from "./formatWorkflowYaml.ts";
import { resolveUses } from "../blockGitHubActionsCI/actions/resolveUses.ts";

export interface MultiWorkflowJobOptions {
  name: string;
  if?: string;
  steps: Array<{ run: string } | { uses: string; with?: Record<string, string> }>;
}

export function createMultiWorkflowFile({
  name,
  jobs,
  concurrency,
  permissions,
}: {
  name: string;
  jobs: MultiWorkflowJobOptions[];
  concurrency?: Record<string, string>;
  permissions?: Record<string, string>;
}) {
  return formatWorkflowYaml({
    name,
    on: {
      pull_request: null,
      push: { branches: ["main"] },
    },
    concurrency,
    permissions,
    jobs: Object.fromEntries(
      jobs.map((job) => [
        createJobName(job.name),
        {
          if: job.if,
          name: job.name,
          "runs-on": "ubuntu-latest",
          steps: [
            { uses: resolveUses("actions/checkout", "v4") },
            { uses: "./.github/actions/prepare" },
            ...job.steps,
          ],
        },
      ]),
    ),
  });
}
