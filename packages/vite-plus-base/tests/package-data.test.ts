import { describe, expect, it } from "vite-plus/test";

import { getPackageDependency, getPackageDependencies } from "../template/src/data/packageData.ts";

describe("getPackageDependencies", () => {
  it("copies tsrs versions from the template package catalog", () => {
    expect(getPackageDependencies("tsrs", "@types/node")).toEqual({
      tsrs: "7.1.0-beta.tsrs2",
      "@types/node": "^26.6.6",
    });
    expect(getPackageDependency("tsrs")).toBe("7.1.0-beta.tsrs2");
  });

  it("throws when the package does not depend on the requested name", () => {
    expect(() => getPackageDependency("not-a-dependency")).toThrow(
      "'not-a-dependency' is neither in package.json's dependencies nor its devDependencies.",
    );
  });
});
