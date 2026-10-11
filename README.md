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

TypeScript scripts use `oxnode` (`@oxc-node/cli`) instead of `tsx`. The template migration guide is [docs/agents/oxnode.md](docs/agents/oxnode.md). Opt-in Vite 8 React setup, including the experimental Oxc React Compiler, is `bingo.blockReact`.
