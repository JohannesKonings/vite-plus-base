import type { ViteUserConfig } from "vite-plus";

export const sharedDefaults: ViteUserConfig = {
  fmt: {},
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
};

export const workspaceDefaults: ViteUserConfig = {
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
    tasks: {
      bingo: {
        command: ["vp exec vite-plus-base-bingo", "vp check --fix"],
        cache: false,
      },
    },
  },
};

export const libraryDefaults: ViteUserConfig = {
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
