import { describe, expect, it } from "vite-plus/test";

import { getPackageDependency, getPackageDependencies } from "../template/src/data/packageData.ts";

describe("getPackageDependencies", () => {
  it("copies TypeScript versions from the template package catalog", () => {
    expect(getPackageDependencies("typescript", "@types/node")).toEqual({
      typescript: "^7.0.2",
      "@types/node": "^24",
    });
    expect(getPackageDependency("typescript")).toBe("^7.0.2");
  });

  it("throws when the package does not depend on the requested name", () => {
    expect(() => getPackageDependency("not-a-dependency")).toThrow(
      "'not-a-dependency' is neither in package.json's dependencies nor its devDependencies.",
    );
  });
});
