# vite-plus-base

Shared Vite+ monorepo base for side projects. Ships one library (`@vite-plus-base/core`) that consumer repos link locally until the GitHub repo is published.

## Quick start

```bash
vp install
vp check
vp run -r build
vp run -r test
```

## Layout

| Path            | Package                                                        |
| --------------- | -------------------------------------------------------------- |
| `packages/core` | `@vite-plus-base/core` — shared helpers for side-project repos |

## Consumer wiring

Link from a sibling checkout (example: `tanstack-aws`):

```json
"@vite-plus-base/core": "link:../../vite-plus-base/packages/core"
```
