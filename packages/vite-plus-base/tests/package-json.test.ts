import { describe, expect, it } from "vite-plus/test";

import {
  defaultDevEngines,
  defaultEngines,
  formatPackageJson,
  mergeDevDependencies,
  mergeDevEngines,
  mergeEngines,
} from "../template/src/blocks/blockPackageJson/package-json.ts";

describe("package-json helpers", () => {
  it("merges devDependencies without removing existing entries", () => {
    expect(mergeDevDependencies({ vite: "catalog:" }, { "dependency-cruiser": "^18.5.0" })).toEqual(
      {
        vite: "catalog:",
        "dependency-cruiser": "^18.5.0",
      },
    );
  });

  it("adds default devEngines and engines when missing", () => {
    expect(mergeDevEngines(undefined)).toEqual(defaultDevEngines);
    expect(mergeEngines(undefined)).toEqual(defaultEngines);
  });

  it("applies default devEngines over existing values", () => {
    expect(
      mergeDevEngines({
        packageManager: { name: "pnpm", version: "11.9.0" },
        runtime: { name: "node", version: "24.18.0", onFail: "download" },
      }),
    ).toEqual(defaultDevEngines);
  });

  it("sets package name from template options", () => {
    expect(
      formatPackageJson(
        { devDependencies: { vite: "catalog:" } },
        {
          name: "my-workspace",
          devDependencies: {
            vite: "catalog:",
            "dependency-cruiser": "^18.5.0",
          },
          devEngines: defaultDevEngines,
          engines: defaultEngines,
        },
      ),
    ).toBe(
      `${JSON.stringify(
        {
          name: "my-workspace",
          devDependencies: {
            vite: "catalog:",
            "dependency-cruiser": "^18.5.0",
          },
          devEngines: defaultDevEngines,
          engines: defaultEngines,
        },
        null,
        2,
      )}\n`,
    );
  });

  it("preserves unrelated package.json fields", () => {
    expect(
      formatPackageJson(
        {
          name: "jk",
          private: true,
          type: "module",
          scripts: { check: "vp check" },
          devEngines: {
            packageManager: { name: "pnpm", version: "12.9.1" },
          },
          engines: { node: ">=22.18.0" },
          devDependencies: { vite: "catalog:" },
        },
        {
          devDependencies: {
            vite: "catalog:",
            "dependency-cruiser": "^18.5.0",
          },
          devEngines: defaultDevEngines,
          engines: defaultEngines,
        },
      ),
    ).toBe(
      `${JSON.stringify(
        {
          name: "jk",
          private: true,
          type: "module",
          scripts: { check: "vp check" },
          devEngines: {
            packageManager: {
              name: "pnpm",
              version: "12.9.1",
              onFail: "download",
            },
            runtime: defaultDevEngines.runtime,
          },
          engines: { node: ">=22.18.0" },
          devDependencies: {
            vite: "catalog:",
            "dependency-cruiser": "^18.5.0",
          },
        },
        null,
        2,
      )}\n`,
    );
  });
});
