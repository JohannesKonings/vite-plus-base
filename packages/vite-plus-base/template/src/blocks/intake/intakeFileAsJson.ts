import { intakeFile } from "./intakeFile.ts";

export function intakeFileAsJson(files: Record<string, unknown>, filePath: string[]) {
  const file = intakeFile(files, filePath);

  if (!file) {
    return undefined;
  }

  try {
    return JSON.parse(file[0]) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
