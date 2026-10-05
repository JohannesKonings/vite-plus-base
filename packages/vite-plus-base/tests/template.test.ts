import { produceTemplate, type Template } from "bingo";
import { prepareOptions } from "bingo/lib/preparation/prepareOptions.js";
import { describe, expect, it } from "vite-plus/test";

import template from "../template/src/template.ts";
import { projectDependencyCruiserConfig } from "../template/src/blocks/contents/dependencyCruiserConfig.ts";

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
        },
      },
      engines: {
        node: ">=22.18.0",
      },
    });
    expect(creation.files?.[".dependency-cruiser.cjs"]).toContain(
      "dependency-cruiser/configs/recommended",
    );
    expect(creation.files?.[".cursor"]).toEqual({
      skills: {
        "dependency-cruiser": {
          "SKILL.md": expect.stringContaining("dependency-cruiser"),
        },
      },
    });
    expect(creation.scripts?.[0]).toMatchObject({ commands: ["vp install"] });
    expect(creation.suggestions?.some((line) => line.includes("dependency-cruiser"))).toBe(true);
    expect(readVsCodeSettings(creation.files)).toEqual({
      "js/ts.experimental.useTsgo": true,
      "js/ts.tsdk.path": "./node_modules/typescript",
      "json.schemaDownload.enable": true,
    });
    expect(readVsCodeExtensions(creation.files)).toEqual({
      recommendations: ["typescriptteam.native-preview"],
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

  it("removes outdated dependency-cruiser.cjs during transition", async () => {
    const creation = await produceTemplate(stratumTemplate, {
      mode: "transition",
      options: templateOptions,
      files: {
        "package.json": existingPackageJson,
        "dependency-cruiser.cjs": "module.exports = { options: {} };",
      },
    } as unknown as Parameters<typeof produceTemplate>[1]);

    expect(creation.scripts).toContainEqual(
      expect.objectContaining({
        phase: 1,
        commands: [
          "find . -name dependency-cruiser.cjs -not -path */node_modules/* -not -path */.git/* -delete",
        ],
        silent: true,
      }),
    );
    expect(creation.files?.[".dependency-cruiser.cjs"]).toContain(
      "dependency-cruiser/configs/recommended",
    );
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
    expect(creation.files?.[".dependency-cruiser.cjs"]).toContain(
      "dependency-cruiser/configs/recommended",
    );
    expect(creation.files?.[".cursor"]).toEqual({
      skills: {
        "dependency-cruiser": {
          "SKILL.md": expect.stringContaining("pnpm exec depcruise src"),
        },
      },
    });
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
      "js/ts.experimental.useTsgo": true,
      "js/ts.tsdk.path": "./node_modules/typescript",
      "json.schemaDownload.enable": true,
      "editor.formatOnSave": true,
    });
    expect(readVsCodeExtensions(creation.files)).toEqual({
      recommendations: ["typescriptteam.native-preview"],
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
      recommendations: ["dbaeumer.vscode-eslint", "typescriptteam.native-preview"],
    });
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
