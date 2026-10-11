type DevEngineSpec = {
  name: string;
  version: string;
  onFail?: string;
};

type DevEngines = {
  packageManager?: DevEngineSpec;
  runtime?: DevEngineSpec;
};

type Engines = {
  node?: string;
};

export const defaultDevEngines: DevEngines = {
  packageManager: {
    name: "pnpm",
    version: "12.9.1",
    onFail: "download",
  },
  runtime: {
    name: "node",
    version: "^24.0.0",
    onFail: "download",
  },
};

export const defaultEngines: Engines = {
  node: ">=22.18.0",
};

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

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies"] as const;

export function omitDependencyNames(
  packageData: Record<string, unknown>,
  names: string[] | undefined,
): Record<string, unknown> {
  if (!names?.length) {
    return packageData;
  }

  const next = { ...packageData };

  for (const field of DEPENDENCY_FIELDS) {
    const value = next[field];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const dependencies = { ...(value as Record<string, string>) };
    let removed = false;
    for (const name of names) {
      if (name in dependencies) {
        delete dependencies[name];
        removed = true;
      }
    }

    if (!removed) {
      continue;
    }

    if (Object.keys(dependencies).length === 0) {
      delete next[field];
    } else {
      next[field] = dependencies;
    }
  }

  return next;
}

export function applyScriptReplacements(
  packageData: Record<string, unknown>,
  replacements: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!replacements || Object.keys(replacements).length === 0) {
    return packageData;
  }

  const scripts = packageData.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    return packageData;
  }

  return {
    ...packageData,
    scripts: {
      ...(scripts as Record<string, unknown>),
      ...replacements,
    },
  };
}

function mergeDevEngineSpec(
  existing: DevEngineSpec | undefined,
  defaults: DevEngineSpec | undefined,
): DevEngineSpec | undefined {
  if (!defaults) {
    return existing;
  }

  return {
    ...existing,
    ...defaults,
  };
}

export function mergeDevEngines(
  existing: DevEngines | undefined,
  defaults: DevEngines = defaultDevEngines,
): DevEngines {
  return {
    ...existing,
    ...defaults,
    packageManager: mergeDevEngineSpec(existing?.packageManager, defaults.packageManager),
    runtime: mergeDevEngineSpec(existing?.runtime, defaults.runtime),
  };
}

export function mergeEngines(
  existing: Engines | undefined,
  defaults: Engines = defaultEngines,
): Engines {
  return {
    ...existing,
    ...defaults,
  };
}

export function formatPackageJson(
  existing: Record<string, unknown>,
  updates: {
    name?: string;
    devDependencies?: Record<string, string>;
    devEngines?: DevEngines;
    engines?: Engines;
  },
): string {
  const next = { ...existing };

  if (updates.name) {
    next.name = updates.name;
  }

  if (updates.devDependencies) {
    next.devDependencies = updates.devDependencies;
  }

  next.devEngines = mergeDevEngines(next.devEngines as DevEngines | undefined, updates.devEngines);
  next.engines = mergeEngines(next.engines as Engines | undefined, updates.engines);

  const { name, ...rest } = next;
  const ordered = typeof name === "string" ? { name, ...rest } : next;

  return `${JSON.stringify(ordered, null, 2)}\n`;
}
