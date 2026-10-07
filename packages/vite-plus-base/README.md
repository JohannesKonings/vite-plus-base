# @jaykingson/vite-plus-base

Opinionated [vite-plus](https://viteplus.dev) defaults for monorepo roots, apps, and libraries.

## Install

```bash
pnpm add -D @jaykingson/vite-plus-base vite-plus
```

## Template (Bingo Stratum)

This package ships a [Bingo Stratum](https://www.create.bingo/engines/stratum/concepts/blocks) template that adds `dependency-cruiser` to `devDependencies`, installs [Matt Pocock's agent skills](https://github.com/mattpocock/skills) under `.agents/skills/`, and applies GitHub engineering setup docs in `docs/agents/`. Use it directly until [vite-plus transition mode](https://viteplus.dev/guide/create) is available.

**First-time setup**:

```bash
pnpm exec vite-plus-base-template --mode setup --directory .
```

**Update after upgrading** `@jaykingson/vite-plus-base`:

```bash
pnpm update @jaykingson/vite-plus-base
vp run bingo
```

`defineWorkspaceConfig` registers a `bingo` task that runs `vite-plus-base-bingo` (transition mode) and then `vp check --fix`.

Without a local install:

```bash
pnpm --package=@jaykingson/vite-plus-base dlx vite-plus-base-template --mode setup --directory .
pnpm --package=@jaykingson/vite-plus-base dlx vite-plus-base-bingo && vp check --fix
```

The template merges `dependency-cruiser` into `package.json`, installs Matt Pocock skills under `.agents/skills/`, writes GitHub issue-tracker setup to `docs/agents/`, patches `AGENTS.md`, and runs `vp install`. Re-run transition after upgrading to pick up version range changes and refresh the vendored skills snapshot.

When vite-plus supports Bingo transition mode, the same template will work via `vp create` without changing the template itself.

### Agent skills

Skills from [mattpocock/skills](https://github.com/mattpocock/skills) are vendored into the template and emitted under `.agents/skills/<skill-name>/`. Transition mode also removes the legacy `.cursor/skills/` directory.

GitHub engineering setup is applied automatically (no interactive prompts):

- `docs/agents/issue-tracker.md` — GitHub Issues via `gh`
- `docs/agents/triage-labels.md` — canonical triage labels
- `docs/agents/domain.md` — domain doc consumer rules

### Glossary map

For monorepos, add a `glossaryMap` under `bingo.blockAgentSkills` in the root `vite.config.ts`. The template generates `GLOSSARY-MAP.md` from it on first setup; transition mode preserves an existing `GLOSSARY-MAP.md`, `docs/agents/*`, and custom `AGENTS.md` subsections.

```ts
export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: { name: "my-monorepo" },
    blockAgentSkills: {
      glossaryMap: {
        root: { glossary: "GLOSSARY.md", adr: "docs/adr" },
        "packages/app": { glossary: "packages/app/GLOSSARY.md" },
      },
    },
  },
});
```

### Maintainer: sync skills

To refresh the vendored Matt Pocock skills snapshot after upstream changes:

```bash
vp run @jaykingson/vite-plus-base#sync-skills
```

This clones [mattpocock/skills](https://github.com/mattpocock/skills) at the pinned ref in `skills-lock.json` and updates `template/src/blocks/blockAgentSkills/vendored/`.

## Changesets release

`blockGitHubActionsCI` writes CI and, when the repo has a publishable package, a release workflow that publishes the version already committed in `package.json`. Opt into Changesets by setting `bingo.blockGitHubActionsCI.release` to `"changesets"`:

```ts
export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: { name: "my-monorepo" },
    blockGitHubActionsCI: {
      release: "changesets",
      repository: "owner/repo",
    },
  },
});
```

Transition then adds `@changesets/cli` and `@changesets/changelog-github`, the root scripts `changeset`, `version-packages`, and `release`, `.changeset/config.json`, and a `release.yaml` workflow. The config publishes with `access: public` and does not version or tag private packages. `repository` can be omitted when a `package.json` `repository` field already points at GitHub; changelog entries use it for pull request and commit links.

Contributors run `vp run changeset` in the pull request. A push to `main` opens or updates a **Version Packages** pull request that bumps versions and writes `CHANGELOG.md`. Merging that pull request publishes to npm, pushes git tags, and creates a GitHub release per package. The workflow keeps the check, test, and build gates, and runs `lint:package` when a package already defines that script. `npmEnvironment` still adds an approval environment. See the generated `docs/agents/ci-release.md` for the one-time GitHub and npm settings.

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
