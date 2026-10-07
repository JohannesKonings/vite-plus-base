import { z } from "zod";

import { base } from "../../base.ts";
import { blockPackageJson } from "../blockPackageJson/blockPackageJson.ts";
import { blockRemoveFiles } from "../blockRemoveFiles/blockRemoveFiles.ts";
import { intakeFile } from "../intake/intakeFile.ts";
import { intakeFileAsJson } from "../intake/intakeFileAsJson.ts";
import { intakeWorkspaceBingo } from "../intake/intakeWorkspaceBingo.ts";
import { createPrepareAction } from "./actions/createPrepareAction.ts";
import {
  CHANGESETS_CHANGELOG_GITHUB_VERSION,
  CHANGESETS_CLI_VERSION,
  createChangesetConfig,
  createChangesetScripts,
  UNCONFIGURED_GITHUB_REPOSITORY,
} from "./changesets.ts";
import { DEFAULT_SETUP_VP_VERSION } from "./constants.ts";
import { createCiReleaseDoc } from "./docs/createCiReleaseDoc.ts";
import {
  detectPublishablePackages,
  readWorkspaceGitHubRepository,
  workspaceHasScript,
  type PackageManifest,
} from "./detectPublishablePackages.ts";
import { detectWorkspaceShape, type WorkspaceShape } from "../intake/detectWorkspaceShape.ts";
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

function changesetsPackageJsonAddon({
  packageData,
  workspaceShape,
  lintPackage,
}: {
  packageData?: Record<string, unknown>;
  workspaceShape: WorkspaceShape;
  lintPackage: boolean;
}) {
  const existingDevDependencies = packageData?.devDependencies as
    | Record<string, string>
    | undefined;

  return blockPackageJson({
    properties: {
      existingPackage: packageData,
      devDependencies: {
        "@changesets/cli": existingDevDependencies?.["@changesets/cli"] ?? CHANGESETS_CLI_VERSION,
        "@changesets/changelog-github":
          existingDevDependencies?.["@changesets/changelog-github"] ??
          CHANGESETS_CHANGELOG_GITHUB_VERSION,
      },
      scripts: createChangesetScripts({ workspaceShape, lintPackage }),
    },
  });
}

function blockGitHubActionsCICreation({
  addons,
}: {
  addons: {
    emitRelease?: boolean;
    auth?: "oidc" | "token";
    npmEnvironment?: string;
    release?: "direct" | "changesets";
    repository?: string;
    packageData?: Record<string, unknown>;
    lintPackage?: boolean;
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
  const useChangesets = emitRelease && addons.release === "changesets";
  const lintPackage = addons.lintPackage ?? false;
  const repositoryIsConfigured = Boolean(addons.repository);
  const repository = addons.repository ?? UNCONFIGURED_GITHUB_REPOSITORY;

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
        release: useChangesets ? "changesets" : "direct",
        lintPackage: useChangesets ? lintPackage : false,
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

  const suggestions = [
    ...(emitRelease
      ? [
          "Configure npm trusted publishing for each publishable package (see docs/agents/ci-release.md).",
        ]
      : []),
    ...(useChangesets
      ? [
          "Add a changeset with `vp run changeset` in pull requests that should be released.",
          'Enable "Allow GitHub Actions to create and approve pull requests" so the Version Packages pull request can be opened.',
          ...(repositoryIsConfigured
            ? []
            : [
                "Set bingo.blockGitHubActionsCI.repository to owner/name so changelog entries link to GitHub.",
              ]),
        ]
      : []),
  ];

  return {
    ...(useChangesets
      ? {
          addons: [
            changesetsPackageJsonAddon({
              packageData: addons.packageData,
              workspaceShape,
              lintPackage,
            }),
          ],
        }
      : {}),
    files: {
      ...(useChangesets
        ? {
            ".changeset": {
              "config.json": createChangesetConfig(repository),
            },
          }
        : {}),
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
                "ci-release.md": createCiReleaseDoc(useChangesets ? "changesets" : "direct"),
              },
            },
          }
        : {}),
    },
    suggestions,
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
    release: z.enum(["direct", "changesets"]).optional(),
    repository: z.string().optional(),
    packageData: z.record(z.string(), z.unknown()).optional(),
    lintPackage: z.boolean().optional(),
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
      release: blockConfig?.release,
      repository: blockConfig?.repository ?? readWorkspaceGitHubRepository(files),
      packageData,
      lintPackage: workspaceHasScript(files, "lint:package"),
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
    const creation = blockGitHubActionsCICreation(context);
    return {
      ...creation,
      addons: [
        ...(creation.addons ?? []),
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
