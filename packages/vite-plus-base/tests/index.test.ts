import type { ViteUserConfig } from "vite-plus";
import { describe, expect, it } from "vite-plus/test";
import {
  defineConfig,
  defineLibraryConfig,
  defineLintPreset,
  defineWorkspaceConfig,
  fmtOverride,
  libraryDefaults,
  lintOverride,
  mergeConfig,
  sharedDefaults,
  workspaceDefaults,
} from "../src/index.ts";

describe("@jaykingson/vite-plus-base", () => {
  it("merges nested config objects", () => {
    expect(
      mergeConfig(
        { lint: { options: { typeAware: true, typeCheck: true } } },
        { lint: { options: { typeCheck: false } } },
      ),
    ).toEqual({
      lint: { options: { typeAware: true, typeCheck: false } },
    });
  });

  it("replaces arrays from overrides by default", () => {
    expect(
      mergeConfig(
        { lint: { jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }] } },
        { lint: { jsPlugins: [{ name: "custom", specifier: "custom-plugin" }] } },
      ),
    ).toEqual({
      lint: { jsPlugins: [{ name: "custom", specifier: "custom-plugin" }] },
    });
  });

  it("appends lint.overrides and fmt.overrides", () => {
    expect(
      mergeConfig(
        {
          lint: {
            overrides: [{ files: ["apps/web/**"], rules: { "no-console": "off" } }],
          },
          fmt: {
            overrides: [{ files: ["**/*.md"], options: { proseWrap: "always" } }],
          },
        },
        {
          lint: {
            overrides: [{ files: ["apps/api/**"], env: { node: true } }],
          },
          fmt: {
            overrides: [{ files: ["apps/api/**"], options: { printWidth: 120 } }],
          },
        },
      ),
    ).toEqual({
      lint: {
        overrides: [
          { files: ["apps/web/**"], rules: { "no-console": "off" } },
          { files: ["apps/api/**"], env: { node: true } },
        ],
      },
      fmt: {
        overrides: [
          { files: ["**/*.md"], options: { proseWrap: "always" } },
          { files: ["apps/api/**"], options: { printWidth: 120 } },
        ],
      },
    });
  });

  it("builds lint overrides", () => {
    const reactLint = defineLintPreset({
      plugins: ["react"],
      rules: { "react/self-closing-comp": "error" },
    });

    expect(lintOverride(["apps/web/**", "packages/ui/**"], reactLint)).toEqual({
      files: ["apps/web/**", "packages/ui/**"],
      plugins: ["react"],
      rules: { "react/self-closing-comp": "error" },
    });
  });

  it("builds format overrides", () => {
    expect(fmtOverride("apps/api/**", { printWidth: 120 })).toEqual({
      files: ["apps/api/**"],
      options: { printWidth: 120 },
    });
  });

  it("exposes shared defaults", () => {
    expect(sharedDefaults.fmt).toEqual({});
    expect(sharedDefaults.lint?.options).toEqual({
      typeAware: true,
      typeCheck: true,
    });
  });

  it("exposes workspace defaults", () => {
    expect(workspaceDefaults.staged).toEqual({ "*": "vp check --fix" });
    expect(workspaceDefaults.run).toEqual({ cache: true });
    expect(workspaceDefaults.lint?.rules).toEqual({
      "vite-plus/prefer-vite-plus-imports": "error",
    });
  });

  it("exposes library defaults", () => {
    const pack = Array.isArray(libraryDefaults.pack)
      ? libraryDefaults.pack[0]
      : libraryDefaults.pack;
    expect(pack?.dts).toEqual({ generator: "tsgo" });
    expect(pack?.exports).toBe(true);
  });

  it("defineConfig layers shared defaults", async () => {
    const config = await resolveConfig(defineConfig({ test: { name: "example" } }));
    expect(config.lint?.options).toEqual({
      typeAware: true,
      typeCheck: true,
    });
    expect(config.test?.name).toBe("example");
  });

  it("defineWorkspaceConfig layers workspace defaults", async () => {
    const config = await resolveConfig(
      defineWorkspaceConfig({
        bingo: {
          blockPackageJson: {
            name: "example",
          },
        },
      }),
    );
    expect(config.staged).toEqual({ "*": "vp check --fix" });
    expect(config.run).toEqual({ cache: true });
  });

  it("defineLibraryConfig layers library defaults", async () => {
    const config = await resolveConfig(defineLibraryConfig({}));
    const pack = Array.isArray(config.pack) ? config.pack[0] : config.pack;
    expect(pack?.exports).toBe(true);
    expect(pack?.dts).toEqual({ generator: "tsgo" });
  });
});

async function resolveConfig(
  config:
    | ViteUserConfig
    | Promise<ViteUserConfig>
    | ((env: { command: string; mode: string }) => ViteUserConfig | Promise<ViteUserConfig>),
) {
  if (typeof config === "function") {
    return await config({ command: "build", mode: "production" });
  }

  return await config;
}
