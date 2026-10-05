import { intakeFile } from "./intakeFile.ts";

export function intakeWorkspaceName(files: Record<string, unknown>): string | undefined {
  const result = intakeFile(files, ["vite.config.ts"]);
  if (!result) {
    return undefined;
  }

  const [content] = result;
  const configMatch = content.match(/defineWorkspaceConfig\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!configMatch) {
    return undefined;
  }

  const nameMatch = configMatch[1].match(/\bname:\s*["']([^"']+)["']/);
  return nameMatch?.[1];
}
