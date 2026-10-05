import { describe, expect, it } from "vite-plus/test";

import { intakeFileAsJson } from "../template/src/blocks/intake/intakeFileAsJson.ts";
import { intakeWorkspaceName } from "../template/src/blocks/intake/intakeWorkspaceName.ts";

describe("intake helpers", () => {
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

  it("reads name from defineWorkspaceConfig in vite.config.ts", () => {
    expect(
      intakeWorkspaceName({
        "vite.config.ts": `import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

export default defineWorkspaceConfig({
  name: "my-monorepo",
  lint: {
    overrides: [],
  },
});`,
      }),
    ).toBe("my-monorepo");
  });
});
