# PROTOTYPE — minimum release age policy

**Status:** Design agreed — implement with `blockGitHubActionsCI` milestone.

## Decision

Scaffolded repos enforce a **2-day minimum release age** across updaters and install-time resolution. One central constant drives all derived values.

| Consumer                     | Derived value                       |
| ---------------------------- | ----------------------------------- |
| Renovate (`renovate.json`)   | `"minimumReleaseAge": "2 days"`     |
| pnpm (`pnpm-workspace.yaml`) | `minimumReleaseAge: 2880` (minutes) |

Central source: `template/src/constants/minimumReleaseAge.ts` (to be created).

## Blocks

| Block              | Emits                                   | Derives from central constant                           |
| ------------------ | --------------------------------------- | ------------------------------------------------------- |
| `blockRenovate`    | `renovate.json`                         | Renovate string (`"2 days"`)                            |
| `blockPackageJson` | `pnpm-workspace.yaml` (create or patch) | pnpm minutes (`2880`) + `minimumReleaseAgeStrict: true` |

Each block imports the constant; no per-block addons.

### `blockRenovate` shape

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "minimumReleaseAge": "2 days",
  "vulnerabilityAlerts": true
}
```

- **All ecosystems** — top-level `minimumReleaseAge` applies to npm, github-actions, and other managers Renovate handles.
- **Security bypass** — vulnerability-driven updates are not held by the 2-day gate (`vulnerabilityAlerts: true`).
- **Not Dependabot** — do not emit `dependabot.yml` for this policy.

### `blockPackageJson` / workspace

- Emit or patch `pnpm-workspace.yaml` with `minimumReleaseAge: 2880` and `minimumReleaseAgeStrict: true`.
- Single-package repos: minimal file (settings only; omit `packages:` — root is the workspace).
- Monorepos: merge into existing `pnpm-workspace.yaml` without disturbing `packages:`.
- No `minimumReleaseAgeExclude` by default.

## Intake / transition

**Always overwrite** to the central value on transition. The template owns this policy; do not preserve user overrides.

## presetDefault wiring

Insert `blockRenovate` after `blockPackageJson`, before `blockAgentSkills`:

```ts
blocks: [
  blockPackageJson,
  blockRenovate,
  blockAgentSkills,
  blockGitHubActionsCI,
  // ...
],
```

## Out of scope

- ADR (not needed).
- `vp migrate` setup-vp pin bumps (template maintenance, not Renovate churn).
- Per-package exclusions (add only if real pain emerges).

## Tests (`template.test.ts`)

1. `renovate.json` extends `config:recommended` with `"minimumReleaseAge": "2 days"`.
2. `pnpm-workspace.yaml` has `minimumReleaseAge: 2880` and `minimumReleaseAgeStrict: true`.
3. Single-package fixture gets minimal `pnpm-workspace.yaml`.
4. Monorepo fixture merges without clobbering `packages:`.
5. Transition overwrites a stale `minimumReleaseAge` in both files.
