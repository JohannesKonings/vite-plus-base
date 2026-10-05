export function intakeFile(files: Record<string, unknown>, filePath: string[]) {
  let current: unknown = files;

  for (const segment of filePath) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  const path = filePath.join("/");

  if (typeof current === "string") {
    return [current, path] as const;
  }

  if (Array.isArray(current) && typeof current[0] === "string") {
    return [current[0], path] as const;
  }

  return undefined;
}
