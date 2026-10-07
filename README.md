# vite-plus-base

Shared Vite+ monorepo base for side projects. Ships `@jaykingson/vite-plus-base`, an opinionated wrapper around vite-plus for apps and libraries.

## Quick start

```bash
vp install
vp check
vp run -r build
vp run -r test
```

## Layout

| Path                      | Package                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `packages/vite-plus-base` | `@jaykingson/vite-plus-base` — opinionated vite-plus config API |

## Consumer wiring

Link from a sibling checkout (example: `tanstack-aws`):

```json
"@jaykingson/vite-plus-base": "link:../../vite-plus-base/packages/vite-plus-base"
```

Then in `vite.config.ts`:

```ts
import { defineWorkspaceConfig } from "@jaykingson/vite-plus-base";

export default defineWorkspaceConfig({});
```

See [packages/vite-plus-base/README.md](packages/vite-plus-base/README.md) for app and library presets.

## Releasing

`@jaykingson/vite-plus-base` is published with [Changesets](https://github.com/changesets/changesets). The root package is private, so it is not versioned, tagged, or published.

1. In a pull request that should ship, run `vp run changeset` and commit the file it adds under `.changeset/`.
2. After that pull request merges to `main`, the release workflow opens or updates a **Version Packages** pull request. That pull request bumps the version and writes `packages/vite-plus-base/CHANGELOG.md` with links to the merged pull request and commit.
3. Merging **Version Packages** publishes the package to npm, pushes the git tag, and creates a GitHub release whose notes are that version's changelog section.

The workflow runs `vp check`, tests, build, and `lint:package` before it publishes. Setup notes for npm trusted publishing and the GitHub Actions pull request permission are in [docs/agents/ci-release.md](docs/agents/ci-release.md).
