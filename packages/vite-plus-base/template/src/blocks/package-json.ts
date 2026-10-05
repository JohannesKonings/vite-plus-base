export function mergeDevDependencies(
  existing: Record<string, string> | undefined,
  additions: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!additions || Object.keys(additions).length === 0) {
    return existing;
  }

  return {
    ...existing,
    ...additions,
  };
}

export function formatPackageJson(
  existing: Record<string, unknown>,
  updates: { name?: string; devDependencies?: Record<string, string> },
): string {
  const next = { ...existing };

  if (updates.name) {
    next.name = updates.name;
  }

  if (updates.devDependencies) {
    next.devDependencies = updates.devDependencies;
  }

  const { name, ...rest } = next;
  const ordered = typeof name === "string" ? { name, ...rest } : next;

  return `${JSON.stringify(ordered, null, 2)}\n`;
}
