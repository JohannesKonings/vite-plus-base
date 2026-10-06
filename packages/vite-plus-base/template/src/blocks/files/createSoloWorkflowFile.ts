/**
 * PROTOTYPE — vendored/adapted from CTA createSoloWorkflowFile.
 */
import { createJobName } from "./createJobName.ts";
import { formatWorkflowYaml } from "./formatWorkflowYaml.ts";

export function createSoloWorkflowFile({
  name,
  on,
  concurrency,
  permissions,
  environment,
  steps,
  jobName,
}: {
  name: string;
  on: Record<string, unknown>;
  concurrency?: Record<string, string>;
  permissions?: Record<string, string>;
  environment?: string;
  steps: Array<Record<string, unknown>>;
  jobName?: string;
}) {
  const id = createJobName(jobName ?? name);

  return formatWorkflowYaml({
    name,
    on,
    concurrency,
    jobs: {
      [id]: {
        ...(jobName && { name: jobName }),
        ...(environment && { environment }),
        permissions,
        "runs-on": "ubuntu-latest",
        steps,
      },
    },
  });
}
