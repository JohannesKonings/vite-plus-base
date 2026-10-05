/**
 * PROTOTYPE — composite prepare action (#8 adopt, setup-vp not pnpm/setup-node).
 *
 * Generated: .github/actions/prepare/action.yaml
 * Steps: voidzero-dev/setup-vp (run-install: false) — no separate vp install here;
 * workflows run `vp install --frozen-lockfile` after prepare so install happens once per job.
 */
import { formatWorkflowYaml } from "../../files/formatWorkflowYaml.ts";

export function createPrepareAction({ setupVpVersion }: { setupVpVersion: string }) {
  return formatWorkflowYaml({
    description: "Prepares the repo for CI and release jobs",
    name: "Prepare",
    runs: {
      using: "composite",
      steps: [
        {
          uses: `voidzero-dev/setup-vp@${setupVpVersion}`,
          with: {
            cache: "true",
            "run-install": "false",
          },
        },
      ],
    },
  });
}
