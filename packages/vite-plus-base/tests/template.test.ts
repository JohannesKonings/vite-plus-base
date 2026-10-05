import { produceTemplate, type Template } from "bingo";
import { prepareOptions } from "bingo/lib/preparation/prepareOptions.js";
import { describe, expect, it } from "vite-plus/test";

import template from "../template/src/template.ts";
import { projectDependencyCruiserConfig } from "../template/src/blocks/contents/dependencyCruiserConfig.ts";

const stratumTemplate = template as unknown as Template;

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
  name: "from-vite-config",
});`;

    const options = await prepareOptions(stratumTemplate, {
      existing: { preset: "default" },
      files: {
        "package.json": existingPackageJson,
        "vite.config.ts": viteConfig,
        ".dependency-cruiser.cjs": projectDependencyCruiserConfig,
      },
    });

    expect(options.name).toBe("from-vite-config");
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
});
