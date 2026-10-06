import { z } from "zod";

import { base } from "../../base.ts";
import { blockRemoveFiles } from "../blockRemoveFiles/blockRemoveFiles.ts";
import { intakeFile } from "../intake/intakeFile.ts";
import { intakeFileAsJson } from "../intake/intakeFileAsJson.ts";
import { intakeWorkspaceBingo } from "../intake/intakeWorkspaceBingo.ts";
import { createPrepareAction } from "./actions/createPrepareAction.ts";
import { DEFAULT_SETUP_VP_VERSION } from "./constants.ts";
import { createCiReleaseDoc } from "./docs/createCiReleaseDoc.ts";
import { detectPublishablePackages, type PackageManifest } from "./detectPublishablePackages.ts";
import { detectWorkspaceShape, type WorkspaceShape } from "./detectWorkspaceShape.ts";
import { createCiWorkflow } from "./workflows/createCiWorkflow.ts";
import { createReleaseWorkflow } from "./workflows/createReleaseWorkflow.ts";
import { withPreviously } from "../files/withPreviously.ts";

const zExtraJob = z.object({
  name: z.string(),
  if: z.string().optional(),
  steps: z.array(
    z.union([
      z.object({ run: z.string() }),
      z.object({ uses: z.string(), with: z.record(z.string(), z.string()).optional() }),
    ]),
  ),
});

function blockGitHubActionsCICreation({
  addons,
}: {
  addons: {
    emitRelease?: boolean;
    auth?: "oidc" | "token";
    npmEnvironment?: string;
    setupVpVersion?: string;
    extraJobs?: z.infer<typeof zExtraJob>[];
    existingCiWorkflow?: string;
    existingReleaseWorkflow?: string;
    workspaceShape?: WorkspaceShape;
    publishablePackages?: PackageManifest[];
  };
}) {
  const setupVpVersion = addons.setupVpVersion ?? DEFAULT_SETUP_VP_VERSION;
  const workspaceShape = addons.workspaceShape ?? "single-package";
  const publishablePackages = addons.publishablePackages ?? [];
  const emitRelease = addons.emitRelease ?? publishablePackages.length > 0;

  const prepareAction = createPrepareAction({ setupVpVersion });
  const ciWorkflow = createCiWorkflow({
    workspaceShape,
    extraJobs: addons.extraJobs,
  });
  const releaseWorkflow = emitRelease
    ? createReleaseWorkflow({
        workspaceShape,
        publishablePackages,
        npmEnvironment: addons.npmEnvironment,
      })
    : undefined;

  const workflowFiles: Record<string, string> = {
    "ci.yaml": withPreviously(ciWorkflow, ["ci.yml"], addons.existingCiWorkflow),
  };

  if (releaseWorkflow) {
    workflowFiles["release.yaml"] = withPreviously(
      releaseWorkflow,
      ["release.yml"],
      addons.existingReleaseWorkflow,
    );
  }

  return {
    files: {
      ".github": {
        actions: {
          prepare: {
            "action.yaml": prepareAction,
          },
        },
        workflows: workflowFiles,
      },
      ...(emitRelease
        ? {
            docs: {
              agents: {
                "ci-release.md": createCiReleaseDoc(),
              },
            },
          }
        : {}),
    },
    suggestions: emitRelease
      ? [
          "Configure npm trusted publishing for each publishable package (see docs/agents/ci-release.md).",
        ]
      : [],
  };
}

export const blockGitHubActionsCI = base.createBlock({
  about: {
    name: "GitHub Actions CI",
  },
  addons: {
    emitRelease: z.boolean().optional(),
    auth: z.enum(["oidc", "token"]).optional(),
    npmEnvironment: z.string().optional(),
    setupVpVersion: z.string().optional(),
    extraJobs: z.array(zExtraJob).optional(),
    existingCiWorkflow: z.string().optional(),
    existingReleaseWorkflow: z.string().optional(),
    workspaceShape: z.enum(["single-package", "package-workspace"]).optional(),
    publishablePackages: z
      .array(
        z.object({
          path: z.string(),
          name: z.string().optional(),
          private: z.boolean().optional(),
        }),
      )
      .optional(),
  },
  intake({ files }) {
    const packageData = intakeFileAsJson(files, ["package.json"]);
    if (!packageData) {
      return undefined;
    }

    const existingCi =
      intakeFile(files, [".github", "workflows", "ci.yaml"]) ??
      intakeFile(files, [".github", "workflows", "ci.yml"]);
    const existingRelease =
      intakeFile(files, [".github", "workflows", "release.yaml"]) ??
      intakeFile(files, [".github", "workflows", "release.yml"]);
    const workspaceBingo = intakeWorkspaceBingo(files);
    const blockConfig = workspaceBingo?.blockGitHubActionsCI;

    return {
      emitRelease: blockConfig?.emitRelease,
      auth: blockConfig?.auth,
      npmEnvironment: blockConfig?.npmEnvironment,
      existingCiWorkflow: existingCi?.[0],
      existingReleaseWorkflow: existingRelease?.[0],
      workspaceShape: detectWorkspaceShape(files),
      publishablePackages: detectPublishablePackages(files),
    };
  },
  produce(context) {
    return blockGitHubActionsCICreation(context);
  },
  transition(context) {
    return {
      ...blockGitHubActionsCICreation(context),
      addons: [
        blockRemoveFiles({
          files: [
            ".circleci",
            ".github/workflows/ci.yml",
            ".github/workflows/release.yml",
            "travis.yaml",
            "travis.yml",
          ],
        }),
      ],
    };
  },
});
