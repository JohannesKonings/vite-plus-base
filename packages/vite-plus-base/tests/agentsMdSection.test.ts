import { describe, expect, it } from "vite-plus/test";

import { patchAgentsMd } from "../template/src/blocks/blockAgentSkills/agentsMdSection.ts";

describe("patchAgentsMd", () => {
  it("keeps non-canonical subsections when updating canonical ones", () => {
    const existing = `# Repo

## Agent skills

### Issue tracker

Old tracker summary.

### Status surfaces

Keep me.

## Before starting work

1. Step one
`;

    const patched = patchAgentsMd(existing, false);

    expect(patched).toContain("### Status surfaces");
    expect(patched).toContain("Keep me.");
    expect(patched).toContain("Issues live in GitHub Issues.");
    expect(patched).toContain("## Before starting work");
    expect(patched).not.toContain("Old tracker summary.");
  });
});
