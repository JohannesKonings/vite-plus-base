import { z } from "zod";

import type { GlossaryMapEntry } from "../../../../src/workspace-config.ts";
import { base } from "../../base.ts";
import { blockPackageJson } from "../blockPackageJson/blockPackageJson.ts";
import { blockRemoveFiles } from "../blockRemoveFiles/blockRemoveFiles.ts";
import { intakeFile } from "../intake/intakeFile.ts";
import { intakeFileAsJson } from "../intake/intakeFileAsJson.ts";
import { intakeWorkspaceBingo } from "../intake/intakeWorkspaceBingo.ts";
import { agentSetupFiles } from "./agentSetupDocs.ts";
import { patchAgentsMd } from "./agentsMdSection.ts";
import { projectDependencyCruiserConfig } from "./dependencyCruiserConfig.ts";
import { formatGlossaryMap } from "./glossaryMap.ts";
import { vendoredSkillFiles } from "./vendoredSkills.ts";

const DEPENDENCY_CRUISER_VERSION = "^18.5.0";
export const DEPENDENCY_CRUISER_CONFIG_PATH = ".dependency-cruiser.cjs";

/**
 * Template-owned dependency-cruiser configs. Transition deletes every match.
 * Users create a repo-specific config via the setup-ts-deep-modules skill.
 */
export const OUTDATED_TEMPLATE_FILES = ["dependency-cruiser.cjs", ".dependency-cruiser.cjs"];
const LEGACY_CURSOR_SKILLS_PATH = ".cursor/skills";

const glossaryMapAddonSchema = z
  .record(
    z.string(),
    z.object({
      glossary: z.string(),
      adr: z.string().optional(),
      summary: z.string().optional(),
    }),
  )
  .optional();

function dependencyCruiserPackageJsonAddon(packageData: Record<string, unknown> | undefined) {
  const existingDevDependencies = packageData?.devDependencies as
    | Record<string, string>
    | undefined;

  return blockPackageJson({
    properties: {
      existingPackage: packageData,
      devDependencies: {
        "dependency-cruiser":
          existingDevDependencies?.["dependency-cruiser"] ?? DEPENDENCY_CRUISER_VERSION,
      },
    },
  });
}

function resolvePackageData(
  addons: { packageData?: Record<string, unknown> },
  options: { packageData?: Record<string, unknown> },
) {
  return addons.packageData ?? options.packageData;
}

function buildAgentSetupFiles(
  addons: {
    issueTrackerDoc?: string;
    triageLabelsDoc?: string;
    domainDoc?: string;
  },
  preserveDocs: boolean,
) {
  const defaults = agentSetupFiles();
  if (!preserveDocs) {
    return defaults;
  }

  const skip = new Set<string>();
  if (addons.issueTrackerDoc) {
    skip.add("issue-tracker.md");
  }
  if (addons.triageLabelsDoc) {
    skip.add("triage-labels.md");
  }
  if (addons.domainDoc) {
    skip.add("domain.md");
  }

  const agents = Object.fromEntries(
    Object.entries(defaults.docs.agents).filter(([filename]) => !skip.has(filename)),
  );

  if (Object.keys(agents).length === 0) {
    return {};
  }

  return {
    docs: {
      agents,
    },
  };
}

function blockAgentSkillsCreation({
  addons,
  options,
  mode,
}: {
  addons: {
    packageData?: Record<string, unknown>;
    agentsMd?: string;
    issueTrackerDoc?: string;
    triageLabelsDoc?: string;
    domainDoc?: string;
    glossaryMapMd?: string;
    glossaryMap?: Record<string, GlossaryMapEntry>;
  };
  options: {
    packageData?: Record<string, unknown>;
    glossaryMap?: Record<string, GlossaryMapEntry>;
  };
  mode: "produce" | "transition";
}) {
  const packageData = resolvePackageData(addons, options);
  const glossaryMap = addons.glossaryMap ?? options.glossaryMap;
  const multiContext = Boolean(glossaryMap && Object.keys(glossaryMap).length > 0);
  const preserveDocs = mode === "transition";
  const agentsMd =
    preserveDocs && addons.agentsMd ? undefined : patchAgentsMd(addons.agentsMd, multiContext);

  const files = {
    ...buildAgentSetupFiles(addons, preserveDocs),
    ...vendoredSkillFiles(),
    ...(mode === "produce"
      ? { [DEPENDENCY_CRUISER_CONFIG_PATH]: projectDependencyCruiserConfig }
      : {}),
    ...(agentsMd ? { "AGENTS.md": agentsMd } : {}),
    ...(glossaryMap && !(preserveDocs && addons.glossaryMapMd)
      ? { "GLOSSARY-MAP.md": formatGlossaryMap(glossaryMap) }
      : {}),
  };

  const suggestions =
    mode === "produce"
      ? [
          "dependency-cruiser was added to devDependencies.",
          "Matt Pocock agent skills were installed under .agents/skills/.",
          "GitHub issue tracker setup was written to docs/agents/.",
          "Run dependency analysis: pnpm exec depcruise src",
        ]
      : [
          "devDependencies were refreshed from @jaykingson/vite-plus-base.",
          "Matt Pocock agent skills were refreshed under .agents/skills/.",
          "Run vp install if dependency-cruiser was added or updated.",
        ];

  return {
    addons: [
      dependencyCruiserPackageJsonAddon(packageData),
      ...(mode === "transition"
        ? [
            ...(OUTDATED_TEMPLATE_FILES.length
              ? [blockRemoveFiles({ files: OUTDATED_TEMPLATE_FILES })]
              : []),
            blockRemoveFiles({ files: [LEGACY_CURSOR_SKILLS_PATH] }),
          ]
        : []),
    ],
    files,
    suggestions,
  };
}

export const blockAgentSkills = base.createBlock({
  about: {
    name: "Agent Skills",
  },
  addons: {
    packageData: z.record(z.string(), z.unknown()).optional(),
    agentsMd: z.string().optional(),
    issueTrackerDoc: z.string().optional(),
    triageLabelsDoc: z.string().optional(),
    domainDoc: z.string().optional(),
    glossaryMapMd: z.string().optional(),
    glossaryMap: glossaryMapAddonSchema,
  },
  intake({ files }) {
    const packageData = intakeFileAsJson(files, ["package.json"]);
    const workspaceBingo = intakeWorkspaceBingo(files);
    const agentsMd = intakeFile(files, ["AGENTS.md"])?.[0];
    const glossaryMapMd = intakeFile(files, ["GLOSSARY-MAP.md"])?.[0];
    const issueTrackerDoc = intakeFile(files, ["docs", "agents", "issue-tracker.md"])?.[0];
    const triageLabelsDoc = intakeFile(files, ["docs", "agents", "triage-labels.md"])?.[0];
    const domainDoc = intakeFile(files, ["docs", "agents", "domain.md"])?.[0];

    if (
      !packageData &&
      !workspaceBingo?.blockAgentSkills?.glossaryMap &&
      !agentsMd &&
      !glossaryMapMd &&
      !issueTrackerDoc &&
      !triageLabelsDoc &&
      !domainDoc
    ) {
      return undefined;
    }

    return {
      ...(packageData ? { packageData } : {}),
      ...(workspaceBingo?.blockAgentSkills?.glossaryMap
        ? { glossaryMap: workspaceBingo.blockAgentSkills.glossaryMap }
        : {}),
      ...(agentsMd ? { agentsMd } : {}),
      ...(glossaryMapMd ? { glossaryMapMd } : {}),
      ...(issueTrackerDoc ? { issueTrackerDoc } : {}),
      ...(triageLabelsDoc ? { triageLabelsDoc } : {}),
      ...(domainDoc ? { domainDoc } : {}),
    };
  },
  produce(context) {
    const mode = (context as { mode?: string }).mode === "transition" ? "transition" : "produce";
    return blockAgentSkillsCreation({ ...context, mode });
  },
  transition(context) {
    return blockAgentSkillsCreation({ ...context, mode: "transition" });
  },
});
