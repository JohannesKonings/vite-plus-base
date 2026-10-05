import type { UserConfig } from "vite";

type PlainObject = Record<string, unknown>;

const CONCAT_ARRAY_PATHS = new Set(["lint.overrides", "fmt.overrides"]);

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathKey(path: string[]): string {
  return path.join(".");
}

function shouldConcatArrays(path: string[]): boolean {
  return CONCAT_ARRAY_PATHS.has(pathKey(path));
}

function mergeConfigDeep(
  base: PlainObject,
  override: PlainObject,
  path: string[] = [],
): PlainObject {
  const result: PlainObject = { ...base };

  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];
    const nextPath = [...path, key];

    if (shouldConcatArrays(nextPath) && Array.isArray(baseValue) && Array.isArray(overrideValue)) {
      result[key] = [...baseValue, ...overrideValue];
      continue;
    }

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = mergeConfigDeep(baseValue, overrideValue, nextPath);
      continue;
    }

    if (overrideValue !== undefined) {
      result[key] = overrideValue;
    }
  }

  return result;
}

export function mergeConfig(base: UserConfig, override: UserConfig = {}): UserConfig {
  return mergeConfigDeep(base as PlainObject, override as PlainObject) as UserConfig;
}
