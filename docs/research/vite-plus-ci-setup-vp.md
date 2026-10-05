# Research: Vite+ CI with setup-vp

Research ticket for [vite-plus-base#7](https://github.com/JohannesKonings/vite-plus-base/issues/7). Sources are primary: [viteplus.dev CI guide](https://viteplus.dev/guide/ci), [GitHub Actions task cache guide](https://viteplus.dev/guide/github-actions-cache), [task caching guide](https://viteplus.dev/guide/cache), [migration rules](https://viteplus.dev/guide/migrate-rules), and [setup-vp v1.21.1](https://github.com/voidzero-dev/setup-vp/tree/v1.21.1) (`action.yml`, README). Researched 2026-10-05.

## Summary

Vite+ CI is centered on a single **`voidzero-dev/setup-vp`** step that installs `vp`, configures Node.js, enables the project package manager, and optionally caches dependency stores. Workflows then run **`vp install`**, **`vp check`**, **`vp test`**, and **`vp build`** (or monorepo equivalents). Pin **`setup-vp` to an exact release tag** (latest: **`v1.21.1`**); never use the frozen **`v1`** tag. **`cache: true`** handles package-manager caching; **Vite Task cache** across runs is separate, experimental, and requires **`vp run`** plus `actions/cache` on `node_modules/.vite/task-cache`.

---

## setup-vp version pinning

| Rule                                                                                                            | Source                                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Pin to an **exact release tag** from [setup-vp releases](https://github.com/voidzero-dev/setup-vp/releases)     | [CI guide — setup-vp Versioning](https://viteplus.dev/guide/ci#setup-vp-versioning)                        |
| A **commit SHA** is also acceptable; add the release tag in a comment for Renovate                              | [CI guide — Automatic Version Updates](https://viteplus.dev/guide/ci#automatic-version-updates)            |
| **Do not use `voidzero-dev/setup-vp@v1`**. The `v1` tag is frozen at **v1.15.0** and no longer receives updates | [setup-vp README — Versioning](https://github.com/voidzero-dev/setup-vp/blob/v1.21.1/README.md#versioning) |
| Latest release at research time: **`v1.21.1`**                                                                  | [GitHub releases API](https://github.com/voidzero-dev/setup-vp/releases/latest)                            |

Example pin:

```yaml
- uses: voidzero-dev/setup-vp@v1.21.1
```

Dependabot (`package-ecosystem: github-actions`) or Renovate can bump pinned tags automatically.

### `vp migrate` and workflow versions

`vp migrate` updates **only** stale `voidzero-dev/setup-vp@v1` references in GitHub Actions workflows and composite actions under `.github`, replacing them with the **latest exact `setup-vp` release known to the installed Vite+ version**. Existing exact version tags and commit SHAs are **left unchanged**.

Source: [Migration rules — CI workflows](https://viteplus.dev/guide/migrate-rules) (also summarized in [CI guide — setup-vp Versioning](https://viteplus.dev/guide/ci#setup-vp-versioning)).

Related: when migration removes `.nvmrc`, it repoints `actions/setup-node` `node-version-file: .nvmrc` references to `.node-version` in `.github/workflows/*.{yml,yaml}` and composite actions under `.github`.

---

## `node-version` and `cache: true`

### `node-version`

From `setup-vp` `action.yml` (v1.21.1):

- **`node-version`**: Node.js version installed via `vp env use`. Omit together with `node-version-file` to let Vite+ resolve from project files (`.node-version`, `package.json#devEngines.runtime`, `package.json#engines.node`, `.nvmrc`).
- **`node-version-file`**: Path to `.nvmrc`, `.node-version`, `.tool-versions`, or `package.json`.
- **`node-manager: false`**: Keep Node.js already on the runner (e.g. from `actions/setup-node`). Cannot combine with `node-version` or `node-version-file`.

The [official GitHub Actions example](https://viteplus.dev/guide/ci#github-actions) uses:

```yaml
node-version: "24"
```

For vite-plus-base (`engines.node: ">=22.18.0"`), `'24'` matches the docs example; alternatively omit `node-version` and rely on project resolution, or set `node-version-file` if the template adds `.node-version`.

### `cache: true`

- Enables **package-manager dependency caching** (pnpm store, npm cache, yarn cache, bun cache) with auto-detected lockfile.
- Cache key format: `vite-plus-{OS}-{arch}-{pm}-{lockfile-hash}` ([setup-vp README — Caching](https://github.com/voidzero-dev/setup-vp/blob/v1.21.1/README.md#caching)).
- **`cache-save`** (default `true`) controls whether the post step writes cache; can restrict saves to `main` pushes.
- Outputs **`cache-hit`** boolean when a matching cache was restored.

With `cache: true`, you **do not need** separate `actions/setup-node` cache configuration or manual dependency cache steps.

---

## Recommended CI commands

Canonical sequence from [viteplus.dev/guide/ci#github-actions](https://viteplus.dev/guide/ci#github-actions):

```yaml
- run: vp install
- run: vp check
- run: vp test
- run: vp build
```

| Command      | Role                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| `vp install` | Install project dependencies (after setup-vp configures the environment) |
| `vp check`   | Lint + format check (Vite+ unified check)                                |
| `vp test`    | Run tests via Vite+ test runner                                          |
| `vp build`   | Build via Vite+ build                                                    |

**Monorepos:** use recursive task runners, e.g. `vp run -r test` and `vp run -r build` (as in vite-plus-base root `package.json` `ready` script).

**Note on `run-install`:** `setup-vp` defaults **`run-install: true`**, so it may already run `vp install` during the setup step. The official CI guide still lists a separate `vp install` step—likely for clarity and to guarantee install ordering before optional task-cache restore. For explicit step boundaries, set `run-install: false` on `setup-vp` and keep the standalone `vp install` step.

**Direct vs `vp run`:** `vp check`, `vp test`, and `vp build` are **direct commands** and do **not** use Vite Task cache. Only commands invoked through **`vp run`** participate in task caching ([task cache guide](https://viteplus.dev/guide/cache)). The basic CI example uses direct commands; task-cache workflows use `vp run <task>`.

---

## Task caching across CI runs

Two separate cache layers:

| Layer                      | What it caches                                  | How                                                     |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| **setup-vp `cache: true`** | Package-manager stores (pnpm/npm/yarn/bun)      | Built into the action                                   |
| **Vite Task cache**        | Task outputs in `node_modules/.vite/task-cache` | Requires `actions/cache/restore` + `actions/cache/save` |

Key facts from [GitHub Actions task cache guide](https://viteplus.dev/guide/github-actions-cache):

- **Experimental** — measure before relying on it in CI.
- Only **`vp run`** tasks use the task cache; **`vp build` directly does not**.
- Restore **`node_modules/.vite/task-cache` after `vp install`** (install can recreate `node_modules`).
- Use a rolling primary key plus restore prefix:

  ```yaml
  key: vite-task-${{ runner.os }}-${{ runner.arch }}-${{ github.run_id }}-${{ github.run_attempt }}
  restore-keys: |
    vite-task-${{ runner.os }}-${{ runner.arch }}-
  ```

- Do **not** put source files or lockfiles in the GitHub Actions cache key; Vite Task fingerprints those internally.
- Verify locally first: run a task twice; the second run should print `cache hit`.

For vite-plus-base's default CI block, **skip task-cache steps initially** unless a measured need exists; `cache: true` on setup-vp alone covers dependency caching.

---

## Official GitHub Actions example

From [viteplus.dev/guide/ci#github-actions](https://viteplus.dev/guide/ci#github-actions):

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: voidzero-dev/setup-vp@v1.21.1
        with:
          node-version: "24"
          cache: true

      - run: vp install
      - run: vp check
      - run: vp test
      - run: vp build
```

The [task-cache guide](https://viteplus.dev/guide/github-actions-cache) extends this with `actions/cache/restore@v6` and `actions/cache/save@v6` steps after install. setup-vp's own [example workflow](https://github.com/voidzero-dev/setup-vp/blob/v1.21.1/README.md#example-workflow) uses `actions/checkout@v7`, `node-version: "lts"`, and `vp run` instead of direct commands—both patterns are valid depending on whether task caching is desired.

---

## Differences from `pnpm/action-setup` + `setup-node`

Documented in [CI guide — Simplifying Existing Workflows](https://viteplus.dev/guide/ci#simplifying-existing-workflows):

| Before (pnpm + setup-node)                                    | After (setup-vp)                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm/action-setup@v6` with `version`                         | _(removed)_                                                             |
| `actions/setup-node@v6` with `node-version` and `cache: pnpm` | `voidzero-dev/setup-vp@<version>` with `node-version` and `cache: true` |
| `pnpm ci && pnpm dev:setup`                                   | `vp install && vp run dev:setup`                                        |
| `pnpm check` / `pnpm test`                                    | `vp check` / `vp test`                                                  |

Additional setup-vp capabilities not present in the pnpm/setup-node pattern:

- **Installs Vite+ (`vp`) globally** via official install scripts.
- **Auto-detects package manager** from lockfile (pnpm, npm, yarn, bun).
- **Resolves Vite+ version** from project `package.json` / catalog / lockfile when `version` input is omitted.
- **`run-install`** (default `true`): optional automatic `vp install` in the setup step.
- **`node-manager: false`**: compose with existing `actions/setup-node` when Node is managed elsewhere.
- **`sfw: true`**: optional Socket Firewall Free wrapper around `vp install`.
- **Separate Vite Task cache** is a Vite+ concern, not something pnpm/setup-node ever handled.

The GitHub Action replaces three concerns—Node setup, package-manager setup, and dependency cache—in one step. You generally **remove** `pnpm/action-setup`, `actions/setup-node`, and manual cache steps.

---

## Recommendations for `blockGitHubActionsCI`

These recommendations inform [vite-plus-base#9](https://github.com/JohannesKonings/vite-plus-base/issues/9).

### Generated files

| Path                                | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `.github/workflows/ci.yml`          | Main CI workflow                                                 |
| `.github/dependabot.yml` (optional) | Weekly `github-actions` ecosystem updates for pinned action tags |

No composite action under `.github/actions` is required unless the block later splits reusable setup; the canonical pattern is a single `setup-vp` step inline.

### Workflow content

1. **Trigger:** `pull_request` and `push` to default branch.
2. **`permissions: contents: read`** (matches task-cache guide; minimal permissions).
3. **`actions/checkout@v4`** (or `@v7`; align with setup-vp README if preferred).
4. **`voidzero-dev/setup-vp@v1.21.1`** with:
   - `node-version: '24'` (matches official example; or derive from template `engines.node` / `.node-version` when present)
   - `cache: true`
   - `run-install: false` if emitting an explicit `vp install` step (avoids double install)
5. **CI steps:** `vp install`, `vp check`, then test/build appropriate to project shape:
   - Single package: `vp test`, `vp build`
   - Monorepo (vite-plus-base default): `vp run -r test`, `vp run -r build`
6. **Do not** add `pnpm/action-setup`, `actions/setup-node`, or manual pnpm/npm cache steps.
7. **Skip Vite Task cache steps** in the initial block; document as an optional addon if task-cache is requested later.
8. **Pin exact setup-vp version** in generated YAML; expose version as a block addon defaulting to `v1.21.1`.

### Block API sketch

| Surface        | Suggestion                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **addons**     | `setupVpVersion` (default `v1.21.1`), `nodeVersion` (default `'24'`), `enableDependabot` (default `true`), `monorepo` (default from workspace detection → switches test/build to `vp run -r …`) |
| **intake**     | Read existing `.github/workflows/ci.yml` if present; detect stale `@v1` pin, pnpm/setup-node pattern, or missing workflow                                                                       |
| **produce**    | Emit fresh workflow from canonical template                                                                                                                                                     |
| **transition** | Upgrade stale `@v1` pins to addon version; replace pnpm/setup-node blocks with setup-vp; preserve custom job steps where possible                                                               |

### Tests (`template.test.ts`)

Assert generated output includes:

- `uses: voidzero-dev/setup-vp@v1.21.1` (or configured addon version)
- `cache: true` and `node-version`
- No `pnpm/action-setup` or `actions/setup-node`
- `vp install`, `vp check`, and appropriate test/build commands
- Optional: dependabot `github-actions` entry when enabled

### Version maintenance

- Template ships with current known-good pin (`v1.21.1`).
- Consumers on stale `@v1` get updated on `vp migrate` / bingo transition.
- Dependabot/Renovate keeps the pin current between template releases.

---

## Sources

- [Continuous Integration — viteplus.dev](https://viteplus.dev/guide/ci)
- [GitHub Actions Cache (Vite Task) — viteplus.dev](https://viteplus.dev/guide/github-actions-cache)
- [Task Caching — viteplus.dev](https://viteplus.dev/guide/cache)
- [Migration Rules — viteplus.dev](https://viteplus.dev/guide/migrate-rules)
- [setup-vp v1.21.1 — action.yml](https://github.com/voidzero-dev/setup-vp/blob/v1.21.1/action.yml)
- [setup-vp v1.21.1 — README](https://github.com/voidzero-dev/setup-vp/blob/v1.21.1/README.md)
- [setup-vp releases](https://github.com/voidzero-dev/setup-vp/releases)
