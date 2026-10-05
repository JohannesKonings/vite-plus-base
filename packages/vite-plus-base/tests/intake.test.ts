import { describe, expect, it } from "vite-plus/test";

import { intakeFileAsJson } from "../template/src/blocks/intake/intakeFileAsJson.ts";
import { intakeForTransition } from "../template/src/blocks/intake/intakeForTransition.ts";
import { intakeWorkspaceBingo } from "../template/src/blocks/intake/intakeWorkspaceBingo.ts";
import { intakeWorkspaceConfig } from "../template/src/blocks/intake/intakeWorkspaceConfig.ts";

describe("intake helpers", () => {
  it("intakeForTransition reads only template-relevant paths", async () => {
    const files = await intakeForTransition("../..");

    expect(files.node_modules).toBeUndefined();
    expect(files.public).toBeUndefined();
    expect(intakeFileAsJson(files, ["package.json"])).toMatchObject({ name: "vite-plus-base" });
    expect(files["vite.config.ts"]).toBeDefined();
  });

  it("reads package.json from bingo directory intake tuples", () => {
    expect(
      intakeFileAsJson(
        {
          "package.json": [
            JSON.stringify({
              name: "jk",
              private: true,
              devDependencies: { vite: "catalog:" },
            }),
            { executable: false },
          ],
        },
        ["package.json"],
      ),
    ).toEqual({
      name: "jk",
      private: true,
      devDependencies: { vite: "catalog:" },
    });
  });

  it("reads nested files from bingo directory intake tuples", () => {
    expect(
      intakeFileAsJson(
        {
          ".vscode": {
            "settings.json": [
              JSON.stringify({
                "editor.formatOnSave": true,
              }),
              { executable: false },
            ],
          },
        },
        [".vscode", "settings.json"],
      ),
    ).toEqual({
      "editor.formatOnSave": true,
    });
  });

  it("parses bingo.blockPackageJson from defineWorkspaceConfig in vite.config.ts", () => {
    expect(
      intakeWorkspaceBingo({
        "vite.config.ts": `import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {
      name: "my-monorepo",
    },
  },
  lint: {
    overrides: [],
  },
});`,
      }),
    ).toEqual({
      blockPackageJson: {
        name: "my-monorepo",
      },
    });
  });

  it("parses glossaryMap from bingo.blockAgentSkills in vite.config.ts", () => {
    expect(
      intakeWorkspaceConfig({
        "vite.config.ts": `import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

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
});`,
      }),
    ).toEqual({
      glossaryMap: {
        root: {
          glossary: "GLOSSARY.md",
          adr: "docs/adr",
        },
        "packages/app": {
          glossary: "packages/app/GLOSSARY.md",
        },
      },
    });
  });

  it("throws for invalid bingo config in vite.config.ts", () => {
    expect(() =>
      intakeWorkspaceBingo({
        "vite.config.ts": `export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: {},
  },
});`,
      }),
    ).toThrow();
  });
});
