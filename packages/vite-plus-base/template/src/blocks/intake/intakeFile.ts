export function intakeFile(files: Record<string, unknown>, filePath: string[]) {
  const path = filePath.join("/");
  const file = files[path];

  if (typeof file === "string") {
    return [file, path] as const;
  }

  if (Array.isArray(file) && typeof file[0] === "string") {
    return [file[0], path] as const;
  }

  return undefined;
}
