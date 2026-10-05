import type { UserConfig } from "vite-plus";

export const sharedDefaults: UserConfig = {
  fmt: {},
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
};

export const workspaceDefaults: UserConfig = {
  ...sharedDefaults,
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    ...sharedDefaults.lint,
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
  },
  run: {
    cache: true,
  },
};

export const libraryDefaults: UserConfig = {
  ...sharedDefaults,
  pack: {
    deps: {
      // tsdown <0.23 compatibility: resolve external dependency subpaths.
      // Remove to preserve subpath imports as written (the new default).
      // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
      resolveDepSubpath: true,
    },
    dts: {
      generator: "tsgo",
    },
    exports: true,
  },
};
