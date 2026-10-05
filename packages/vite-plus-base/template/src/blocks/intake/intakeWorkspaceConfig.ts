import type { GlossaryMapEntry } from "../../../../src/workspace-config.ts";
import { intakeWorkspaceBingo } from "./intakeWorkspaceBingo.ts";

export function intakeWorkspaceConfig(
  files: Record<string, unknown>,
): { glossaryMap?: Record<string, GlossaryMapEntry> } | undefined {
  const bingo = intakeWorkspaceBingo(files);
  if (!bingo) {
    return undefined;
  }

  const glossaryMap = bingo.blockAgentSkills?.glossaryMap;
  if (!glossaryMap) {
    return {};
  }

  return { glossaryMap };
}
