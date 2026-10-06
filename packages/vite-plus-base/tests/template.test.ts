import { produceTemplate, type Template } from "bingo";
import { prepareOptions } from "bingo/lib/preparation/prepareOptions.js";
import { describe, expect, it } from "vite-plus/test";

import template from "../template/src/template.ts";
import { projectDependencyCruiserConfig } from "../template/src/blocks/blockAgentSkills/dependencyCruiserConfig.ts";

const stratumTemplate = template as unknown as Template;

function readVsCodeSettings(files: { ".vscode"?: unknown } | undefined) {
  const vscodeDirectory = files?.[".vscode"];
  if (!vscodeDirectory || typeof vscodeDirectory !== "object") {
    throw new Error("expected .vscode directory");
  }

  const settingsJson = (vscodeDirectory as { "settings.json"?: unknown })["settings.json"];
  if (typeof settingsJson !== "string") {
    throw new Error("expected .vscode/settings.json");
  }

  return JSON.parse(settingsJson) as Record<string, unknown>;
}

function readVsCodeExtensions(files: { ".vscode"?: unknown } | undefined) {
  const vscodeDirectory = files?.[".vscode"];
  if (!vscodeDirectory || typeof vscodeDirectory !== "object") {
    throw new Error("expected .vscode directory");
  }

  const extensionsJson = (vscodeDirectory as { "extensions.json"?: unknown })["extensions.json"];
  if (typeof extensionsJson !== "string") {
    throw new Error("expected .vscode/extensions.json");
  }

  return JSON.parse(extensionsJson) as { recommendations?: string[] };
}

function readNestedFile(files: Record<string, unknown> | undefined, pathSegments: string[]) {
  let current: unknown = files;

  for (const segment of pathSegments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

const existingPackageJson = JSON.stringify({
  name: "app",
  version: "1.0.0",
  private: true,
  type: "module",
  scripts: {
    check: "vp check",
  },
  devDependencies: {
    vite: "catalog:",
  },
  devEngines: {
    packageManager: {
      name: "pnpm",
      version: "12.9.1",
      onFail: "download",
    },
    runtime: {
      name: "node",
      version: "^24.0.0",
      onFail: "download",
    },
  },
  engines: {
    node: ">=22.18.0",
  },
});

const existingPackageData = JSON.parse(existingPackageJson);
const templateOptions = { preset: "default", name: "app", packageData: existingPackageData };

describe("vite-plus-base-template", () => {
  it("adds dependency-cruiser without changing other package.json fields in setup mode", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg).toEqual({
      name: "app",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        check: "vp check",
      },
      devDependencies: {
        vite: "catalog:",
        "dependency-cruiser": "^18.5.0",
        "@types/node": "^24",
        typescript: "^7.0.2",
      },
      devEngines: {
        packageManager: {
          name: "pnpm",
          version: "12.9.1",
          onFail: "download",
        },
        runtime: {
          name: "node",
          version: "^24.0.0",
          onFail: "download",
        },
      },
      engines: {
        node: ">=22.18.0",
      },
    });
    expect(creation.files?.[".dependency-cruiser.cjs"]).toContain(
      "dependency-cruiser/configs/recommended",
    );
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        ".agents",
        "skills",
        "setup-matt-pocock-skills",
        "SKILL.md",
      ]),
    ).toContain("setup-matt-pocock-skills");
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        "docs",
        "agents",
        "issue-tracker.md",
      ]),
    ).toContain("gh issue create");
    expect(creation.files?.["AGENTS.md"]).toContain("## Agent skills");
    expect(creation.scripts?.[0]).toMatchObject({ commands: ["vp install"] });
    expect(creation.suggestions?.some((line) => line.includes("dependency-cruiser"))).toBe(true);
    expect(readVsCodeSettings(creation.files)).toEqual({
      "editor.defaultFormatter": "oxc.oxc-vscode",
      "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "oxc.disableNestedConfig": true,
      "oxc.fmt.disableNestedConfig": true,
      "editor.formatOnSave": true,
      "editor.formatOnSaveMode": "file",
      "editor.codeActionsOnSave": {
        "source.fixAll.oxc": "explicit",
      },
      "npm.scriptRunner": "vp",
      "js/ts.experimental.useTsgo": true,
      "js/ts.tsdk.path": "./node_modules/typescript",
      "json.schemaDownload.enable": true,
    });
    expect(readVsCodeExtensions(creation.files)).toEqual({
      recommendations: ["VoidZero.vite-plus-extension-pack", "typescriptteam.native-preview"],
    });
  });

  it("refreshes managed files in transition mode", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies?.["dependency-cruiser"]).toBe("^18.5.0");
    expect(pkg.private).toBe(true);
    expect(creation.scripts?.[0]).toMatchObject({ commands: ["vp install"] });
  });

  it("preserves catalog dependency-cruiser version during transition", async () => {
    const packageJsonWithCatalog = JSON.stringify({
      ...JSON.parse(existingPackageJson),
      devDependencies: {
        vite: "catalog:",
        "dependency-cruiser": "catalog:",
      },
    });

    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": packageJsonWithCatalog,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies?.["dependency-cruiser"]).toBe("catalog:");
    expect(pkg.devDependencies?.vite).toBe("catalog:");
  });

  it("removes template-owned dependency-cruiser configs during transition", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "dependency-cruiser.cjs": "module.exports = { options: {} };",
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const cleanupScripts = creation.scripts?.find(
      (script) => (script as { phase?: number }).phase === 1,
    ) as { commands?: string[] } | undefined;
    expect(cleanupScripts?.commands).toContain(
      "find . -name dependency-cruiser.cjs -not -path '*/node_modules/*' -not -path '*/.git/*' -delete",
    );
    expect(cleanupScripts?.commands).toContain(
      "find . -name .dependency-cruiser.cjs -not -path '*/node_modules/*' -not -path '*/.git/*' -delete",
    );
    expect(creation.files?.[".dependency-cruiser.cjs"]).toBeUndefined();
  });

  it("removes legacy .cursor/skills during transition", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        ".cursor": {
          skills: {
            "dependency-cruiser": {
              "SKILL.md": "stale skill",
            },
          },
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.scripts).toContainEqual(
      expect.objectContaining({
        phase: 1,
        commands: expect.arrayContaining([
          "find . -path '*/.cursor/skills/*' -not -path '*/node_modules/*' -not -path '*/.git/*' -delete",
          "find . -type d -path '*/.cursor/skills' -not -path '*/node_modules/*' -not -path '*/.git/*' -delete",
        ]),
        silent: true,
      }),
    );
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        ".agents",
        "skills",
        "setup-matt-pocock-skills",
        "SKILL.md",
      ]),
    ).toContain("setup-matt-pocock-skills");
  });

  it("adds dependency-cruiser when template files already exist on disk", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
        ".cursor": {
          skills: {
            "dependency-cruiser": {
              "SKILL.md": "stale skill",
            },
          },
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies?.["dependency-cruiser"]).toBe("^18.5.0");
    expect(pkg.private).toBe(true);
    expect(creation.files?.[".dependency-cruiser.cjs"]).toBeUndefined();
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        ".agents",
        "skills",
        "setup-matt-pocock-skills",
        "SKILL.md",
      ]),
    ).toContain("setup-matt-pocock-skills");
  });

  it("uses name from defineWorkspaceConfig in vite.config.ts", async () => {
    const viteConfig = `import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {
      name: "from-vite-config",
    },
  },
});`;

    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "vite.config.ts": viteConfig,
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.name).toBe("from-vite-config");
  });

  it("generates GLOSSARY-MAP.md from bingo.blockAgentSkills.glossaryMap in vite.config.ts", async () => {
    const viteConfig = `import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {
      name: "my-monorepo",
    },
    blockAgentSkills: {
      glossaryMap: {
        root: {
          glossary: "GLOSSARY.md",
          adr: "docs/adr",
        },
        "packages/app": {
          glossary: "packages/app/GLOSSARY.md",
        },
      },
    },
  },
});`;

    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "vite.config.ts": viteConfig,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.files?.["GLOSSARY-MAP.md"]).toContain("| root | GLOSSARY.md | docs/adr |");
    expect(creation.files?.["GLOSSARY-MAP.md"]).toContain(
      "| packages/app | packages/app/GLOSSARY.md |",
    );
    expect(creation.files?.["AGENTS.md"]).toContain("GLOSSARY-MAP.md");
  });

  it("preserves customized agent docs during transition", async () => {
    const customAgentsMd = `# Agent instructions

## Agent skills

### Issue tracker

Custom issue tracker summary. See \`docs/agents/issue-tracker.md\`.

### Status surfaces

Keep this custom subsection.

## Before starting work

1. Confirm lane
`;

    const customGlossaryMap = "# Glossary map\n\nCustom glossary map content.\n";
    const customIssueTracker = "# Issue tracker: GitHub\n\nCustom repo-specific tracker.\n";

    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
        "AGENTS.md": customAgentsMd,
        "GLOSSARY-MAP.md": customGlossaryMap,
        docs: {
          agents: {
            "issue-tracker.md": customIssueTracker,
            "triage-labels.md": "# Triage Labels\n\nCustom labels.\n",
            "domain.md": "# Domain Docs\n\nCustom domain docs.\n",
          },
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.files?.["AGENTS.md"]).toBeUndefined();
    expect(creation.files?.["GLOSSARY-MAP.md"]).toBeUndefined();
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        "docs",
        "agents",
        "issue-tracker.md",
      ]),
    ).toBeUndefined();
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        ".agents",
        "skills",
        "setup-matt-pocock-skills",
        "SKILL.md",
      ]),
    ).toContain("setup-matt-pocock-skills");
  });

  it("preserves extra AGENTS.md subsections when patching canonical ones", async () => {
    const existingAgentsMd = `# Agent instructions

## Agent skills

### Issue tracker

Old summary. See \`docs/agents/issue-tracker.md\`.

### Status surfaces

Custom status surfaces section.

## Before starting work

1. Confirm lane
`;

    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "AGENTS.md": existingAgentsMd,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.files?.["AGENTS.md"]).toContain("### Status surfaces");
    expect(creation.files?.["AGENTS.md"]).toContain("Custom status surfaces section.");
    expect(creation.files?.["AGENTS.md"]).toContain("Issues live in GitHub Issues.");
    expect(creation.files?.["AGENTS.md"]).toContain("## Before starting work");
  });

  it("uses packageData from prepareOptions like transition CLI", async () => {
    const options = await prepareOptions(stratumTemplate, {
      existing: { preset: "default" },
      files: {
        "package.json": existingPackageJson,
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
      },
    });

    expect(options.name).toBe("app");
    expect(options.packageData).toMatchObject(existingPackageData);

    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options,
      files: {
        "package.json": existingPackageJson,
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies?.["dependency-cruiser"]).toBe("^18.5.0");
    expect(pkg.private).toBe(true);
  });

  it("points VS Code at the repo TypeScript and keeps other settings", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        ".vscode": {
          "settings.json": `${JSON.stringify({ "editor.formatOnSave": true }, null, 2)}\n`,
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(readVsCodeSettings(creation.files)).toEqual({
      "editor.defaultFormatter": "oxc.oxc-vscode",
      "[javascript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "[javascriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "[typescript]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "[typescriptreact]": { "editor.defaultFormatter": "oxc.oxc-vscode" },
      "oxc.disableNestedConfig": true,
      "oxc.fmt.disableNestedConfig": true,
      "editor.formatOnSave": true,
      "editor.formatOnSaveMode": "file",
      "editor.codeActionsOnSave": {
        "source.fixAll.oxc": "explicit",
      },
      "npm.scriptRunner": "vp",
      "js/ts.experimental.useTsgo": true,
      "js/ts.tsdk.path": "./node_modules/typescript",
      "json.schemaDownload.enable": true,
    });
    expect(readVsCodeExtensions(creation.files)).toEqual({
      recommendations: ["VoidZero.vite-plus-extension-pack", "typescriptteam.native-preview"],
    });
  });

  it("leaves unreadable VS Code settings untouched", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        ".vscode": {
          "settings.json": "{\n  // comment\n}\n",
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.files?.[".vscode"]).toBeUndefined();
    expect(creation.suggestions?.some((line) => line.includes("js/ts.tsdk.path"))).toBe(true);
  });

  it("preserves existing extension recommendations", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        ".vscode": {
          "extensions.json": `${JSON.stringify({ recommendations: ["dbaeumer.vscode-eslint"] }, null, 2)}\n`,
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(readVsCodeExtensions(creation.files)).toEqual({
      recommendations: [
        "VoidZero.vite-plus-extension-pack",
        "dbaeumer.vscode-eslint",
        "typescriptteam.native-preview",
      ],
    });
  });

  it("emits GitHub Actions CI workflows in setup mode", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const ciWorkflow = readNestedFile(creation.files as Record<string, unknown>, [
      ".github",
      "workflows",
      "ci.yaml",
    ]);
    const prepareAction = readNestedFile(creation.files as Record<string, unknown>, [
      ".github",
      "actions",
      "prepare",
      "action.yaml",
    ]);

    expect(ciWorkflow).toContain("name: CI");
    expect(ciWorkflow).toContain("uses: ./.github/actions/prepare");
    expect(ciWorkflow).toContain("vp install --frozen-lockfile");
    expect(ciWorkflow).toContain("vp check");
    expect(ciWorkflow).toContain("vp test");
    expect(ciWorkflow).toContain("vp build");
    expect(ciWorkflow).not.toContain("pnpm/action-setup");
    expect(prepareAction).toContain("voidzero-dev/setup-vp@v1.21.1");
    expect(prepareAction).toContain('cache: "true"');
    expect(prepareAction).toContain('run-install: "false"');
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        ".github",
        "workflows",
        "release.yaml",
      ]),
    ).toBeUndefined();
  });

  it("emits release workflow for publishable workspace packages", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
        packages: {
          lib: {
            "package.json": JSON.stringify({
              name: "@acme/lib",
              version: "1.0.0",
              exports: { ".": "./dist/index.mjs" },
              scripts: { build: "vp pack" },
            }),
          },
        },
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const releaseWorkflow = readNestedFile(creation.files as Record<string, unknown>, [
      ".github",
      "workflows",
      "release.yaml",
    ]);

    expect(releaseWorkflow).toContain("id-token: write");
    expect(releaseWorkflow).toContain("Publish @acme/lib");
    expect(releaseWorkflow).toContain("pnpm publish --no-git-checks --access public");
    expect(
      readNestedFile(creation.files as Record<string, unknown>, [
        "docs",
        "agents",
        "ci-release.md",
      ]),
    ).toContain("npm trusted publishing");
  });

  it("emits minimum release age policy in setup mode for single-package repos", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const renovateJson = JSON.parse(creation.files?.["renovate.json"] as string);
    expect(renovateJson).toEqual({
      $schema: "https://docs.renovatebot.com/renovate-schema.json",
      extends: ["config:recommended"],
      minimumReleaseAge: "2 days",
      vulnerabilityAlerts: true,
    });
    expect(creation.files?.["pnpm-workspace.yaml"]).toBe(
      "minimumReleaseAge: 2880\nminimumReleaseAgeStrict: true\n",
    );
    expect(creation.files?.["dependabot.yml"]).toBeUndefined();
  });

  it("merges minimum release age into existing pnpm-workspace.yaml for package workspaces", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "setup",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.files?.["pnpm-workspace.yaml"]).toBe(
      "minimumReleaseAge: 2880\nminimumReleaseAgeStrict: true\n\npackages:\n  - packages/*\n",
    );
    expect(JSON.parse(creation.files?.["renovate.json"] as string).minimumReleaseAge).toBe(
      "2 days",
    );
  });

  it("overwrites stale minimum release age settings during transition", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "renovate.json": JSON.stringify({
          extends: ["config:recommended"],
          minimumReleaseAge: "7 days",
          vulnerabilityAlerts: false,
        }),
        "pnpm-workspace.yaml":
          "minimumReleaseAge: 10080\nminimumReleaseAgeStrict: false\npackages:\n  - packages/*\n",
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const renovateJson = JSON.parse(creation.files?.["renovate.json"] as string);
    expect(renovateJson.minimumReleaseAge).toBe("2 days");
    expect(renovateJson.vulnerabilityAlerts).toBe(true);
    expect(creation.files?.["pnpm-workspace.yaml"]).toBe(
      "minimumReleaseAge: 2880\nminimumReleaseAgeStrict: true\n\npackages:\n  - packages/*\n",
    );
  });

  it("preserves catalog TypeScript dependencies during transition", async () => {
    const packageJsonWithCatalog = JSON.stringify({
      ...JSON.parse(existingPackageJson),
      devDependencies: {
        vite: "catalog:",
        "@types/node": "catalog:",
        typescript: "catalog:",
      },
    });

    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": packageJsonWithCatalog,
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    const pkg = JSON.parse(creation.files?.["package.json"] as string);
    expect(pkg.devDependencies?.typescript).toBe("catalog:");
    expect(pkg.devDependencies?.["@types/node"]).toBe("catalog:");
  });
});
