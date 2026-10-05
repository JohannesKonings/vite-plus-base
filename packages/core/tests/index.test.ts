import { describe, expect, it } from "vite-plus/test";
import { formatSideProjectLabel, VITE_PLUS_BASE_VERSION } from "../src/index.ts";

describe("@vite-plus-base/core", () => {
  it("exposes a stable base version", () => {
    expect(VITE_PLUS_BASE_VERSION).toBe("0.1.0");
  });

  it("formats side-project labels", () => {
    expect(formatSideProjectLabel("tanstack-aws")).toBe("tanstack-aws (vite-plus-base)");
  });
});
