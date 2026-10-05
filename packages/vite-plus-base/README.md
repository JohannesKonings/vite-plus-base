# @jaykingson/vite-plus-base

Opinionated [vite-plus](https://viteplus.dev) defaults for monorepo roots, apps, and libraries.

## Install

```bash
pnpm add -D @jaykingson/vite-plus-base vite-plus
```

## Template (Bingo Stratum)

This package ships a [Bingo Stratum](https://www.create.bingo/engines/stratum/concepts/blocks) template that adds `dependency-cruiser` to `devDependencies`, following the same block pattern as [create-typescript-app's `blockPackageJson`](https://github.com/JoshuaKGoldberg/create-typescript-app/blob/main/src/blocks/blockPackageJson.ts). Use it directly until [vite-plus transition mode](https://viteplus.dev/guide/create) is available.

**First-time setup**:

```bash
pnpm exec vite-plus-base-template --mode setup --directory .
```

**Update after upgrading** `@jaykingson/vite-plus-base`:

```bash
pnpm update @jaykingson/vite-plus-base
pnpm exec vite-plus-base-bingo
```

`vite-plus-base-bingo` runs `vite-plus-base-template --mode transition --preset default --directory .`.

Without a local install:

```bash
pnpm --package=@jaykingson/vite-plus-base dlx vite-plus-base-template --mode setup --directory .
pnpm --package=@jaykingson/vite-plus-base dlx vite-plus-base-bingo
```

The template merges `dependency-cruiser` into `package.json` and runs `vp install`. Re-run transition after upgrading to pick up version range changes.

When vite-plus supports Bingo transition mode, the same template will work via `vp create` without changing the template itself.

## Usage

**Monorepo root** (`vite.config.ts`):

```ts
import { defineLintPreset, defineWorkspaceConfig, lintOverride } from "@jaykingson/vite-plus-base";

const reactLint = defineLintPreset({
  plugins: ["react"],
  rules: { "react/self-closing-comp": "error" },
});

export default defineWorkspaceConfig({
  lint: {
    overrides: [
      lintOverride(["apps/web/**", "packages/ui/**"], reactLint),
      lintOverride(["**/*.test.ts", "**/*.spec.ts"], {
        plugins: ["vitest"],
        rules: { "typescript/no-explicit-any": "off" },
      }),
    ],
  },
});
```

Globs are resolved from the root `vite.config.ts`, so use workspace paths such as `apps/web/**` and `packages/ui/**`. See the [vite-plus monorepo guide](https://viteplus.dev/guide/monorepo) for details.

**Library package**:

```ts
import { defineLibraryConfig } from "@jaykingson/vite-plus-base";

export default defineLibraryConfig({
  // Vite / pack / test config for this package
});
```

**App or custom package**:

```ts
import { defineConfig } from "@jaykingson/vite-plus-base";

export default defineConfig({
  // lighter shared defaults only
});
```

## Overriding defaults

| What you want to change            | How                                                                   |
| ---------------------------------- | --------------------------------------------------------------------- |
| Rules for one app or package       | `lint.overrides` via `lintOverride()` in the root config              |
| Formatting for one path            | `fmt.overrides` via `fmtOverride()` in the root config                |
| Shared lint preset without `files` | `defineLintPreset()` in a separate file, spread into `lintOverride()` |
| Global lint / fmt / run settings   | Pass a partial config to `defineWorkspaceConfig()`                    |
| One nested lint flag               | `lint: { options: { typeCheck: false } }` (deep-merged)               |
| Full control, no presets           | `defineVitePlusConfig()`                                              |

`lint.overrides` and `fmt.overrides` arrays are **appended** to any defaults. Other arrays (such as `lint.jsPlugins`) are replaced when you provide them.

For monorepos, prefer root `lint.overrides` / `fmt.overrides` over per-package `lint` or `fmt` blocks. `vp check` always uses the root lint and format settings.

## Composing presets

Split overrides into small modules and compose them in the root config:

```ts
// tooling/lint/react.ts
import { defineLintPreset } from "@jaykingson/vite-plus-base";

export const reactLint = defineLintPreset({
  plugins: ["react"],
  rules: { "react/self-closing-comp": "error" },
});
```

```ts
// vite.config.ts
import { defineWorkspaceConfig, lintOverride } from "@jaykingson/vite-plus-base";
import { reactLint } from "./tooling/lint/react";

export default defineWorkspaceConfig({
  lint: {
    overrides: [lintOverride(["apps/web/**"], reactLint)],
  },
});
```
