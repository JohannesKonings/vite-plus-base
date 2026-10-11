export type IntakeTextFile = {
  path: string;
  text: string;
};

function readText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

export function collectTextFiles(
  files: Record<string, unknown>,
  fileName: string,
): IntakeTextFile[] {
  const results: IntakeTextFile[] = [];

  function walk(node: unknown, prefix: string) {
    const direct = prefix.endsWith(fileName) ? readText(node) : undefined;
    if (direct !== undefined && !prefix.split("/").includes("node_modules")) {
      results.push({ path: prefix, text: direct });
      return;
    }

    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const nextPath = prefix ? `${prefix}/${key}` : key;
      if (nextPath.split("/").includes("node_modules")) {
        continue;
      }

      if (key === fileName) {
        const text = readText(value);
        if (text !== undefined) {
          results.push({ path: nextPath, text });
        }
        continue;
      }

      if (value && typeof value === "object") {
        walk(value, nextPath);
      }
    }
  }

  walk(files, "");
  return results;
}

export type CreatedDirectory = {
  [key: string]: string | CreatedDirectory;
};

export function writeNestedFile(tree: CreatedDirectory, relativePath: string, contents: string) {
  const parts = relativePath.split("/");
  let current = tree;

  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (typeof existing !== "object") {
      const directory: CreatedDirectory = {};
      current[part] = directory;
      current = directory;
      continue;
    }
    current = existing;
  }

  const filename = parts.at(-1);
  if (filename) {
    current[filename] = contents;
  }
}
