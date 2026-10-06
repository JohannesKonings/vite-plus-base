# PROTOTYPE — blockGitHubActionsCI outline

**Ticket:** [#9 — How should blockGitHubActionsCI compose generated workflow files?](https://github.com/JohannesKonings/vite-plus-base/issues/9)  
**Branch:** `prototype/block-github-actions-ci-outline`  
**Status:** Throwaway design artifact — do not merge as-is.

## Decision

One deep module `blockGitHubActionsCI` owns all generated GitHub Actions files. It vendors CTA workflow helpers (`createMultiWorkflowFile`, `createSoloWorkflowFile`, `withPreviously`, `formatWorkflowYaml`) under `template/src/blocks/files/` and keeps Vite+-specific logic (setup-vp prepare, publishable detection, workspace shape) in `template/src/blocks/blockGitHubActionsCI/`.

### Generated file layout

| Path                                  | Always?                   | Purpose                                                                                                 |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.github/actions/prepare/action.yaml` | Yes                       | Composite: single `voidzero-dev/setup-vp@<version>` with `cache: true`, `run-install: false`            |
| `.github/workflows/ci.yaml`           | Yes                       | One **Check** job (#4): checkout → prepare → `vp install --frozen-lockfile` → `vp check` → test → build |
| `.github/workflows/release.yaml`      | When publishable (#5, #6) | Solo workflow: same verification gate, then publish committed versions                                  |

No other files under `.github/actions/`. Use `.yaml` extension; `withPreviously` handles `.yml` → `.yaml` on transition.

**Not in v1:** `dependabot.yml` (use Renovate via `blockRenovate` — see `template/src/constants/PROTOTYPE-minimum-release-age.md`), branch rulesets, `pr-review-requested.yaml`, Vite Task cache steps.

### Block API

| Surface        | Shape                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **addons**     | `emitRelease?: boolean` (override), `setupVpVersion?: string` (default `v1.21.1`), `extraJobs?: Job[]` (extension point for future blocks)                              |
| **intake**     | Read `ci.yaml`/`ci.yml`, `release.yaml`/`release.yml`; read `bingo.blockGitHubActionsCI` from `vite.config.ts`; scan manifests for publishable packages at produce time |
| **produce**    | Emit `.github/**` files; `suggestions` nudge npm trusted publishing when release emits                                                                                  |
| **transition** | Regenerate workflows + `blockRemoveFiles` for `.circleci`, `travis.*`, legacy `.yml` workflows                                                                          |

### Internal modules (implementation seam)

```
blockGitHubActionsCI/
  blockGitHubActionsCI.ts       # block definition
  detectPublishablePackages.ts  # #5
  detectWorkspaceShape.ts       # single vs vp run -r (#4)
  constants.ts
  actions/
    createPrepareAction.ts
    resolveUses.ts
  workflows/
    createCiWorkflow.ts
    createReleaseWorkflow.ts
files/                          # vendored CTA helpers
  createMultiWorkflowFile.ts
  createSoloWorkflowFile.ts
  createJobName.ts
  formatWorkflowYaml.ts
  withPreviously.ts
```

### presetDefault wiring

Insert after `blockAgentSkills`, before `blockTypeScript`:

```ts
blocks: [
  blockPackageJson,
  blockAgentSkills,
  blockGitHubActionsCI,
  blockTypeScript,
  blockVSCode,
  blockRemoveFiles, // stays last
],
```

### workspace-config.ts

Add `blockGitHubActionsCIConfigSchema` with `emitRelease?: boolean`; extend `intakeWorkspaceBingo` to parse it.

### template.test.ts assertions

1. **CI always emits** — `ci.yaml` + prepare action with pinned setup-vp, no pnpm/setup-node.
2. **Commands** — frozen install, check, test, build; monorepo fixture uses `vp run -r`.
3. **Node pin** — workflow does **not** repeat `node-version`; reads `devEngines.runtime` via setup-vp.
4. **Concurrency** — `cancel-in-progress` only on `pull_request`.
5. **Release conditional** — absent for private app-only; present for publishable workspace child; respects `emitRelease` override.
6. **Transition** — removes `ci.yml`; upgrades to `ci.yaml`.

See `packages/vite-plus-base/tests/prototype-blockGitHubActionsCI.test-outline.ts` for the full test matrix.

### Explicitly deferred

- Auth/OIDC publish steps → [#10](https://github.com/JohannesKonings/vite-plus-base/issues/10)
- ~~Dependabot github-actions~~ → covered by `blockRenovate` (minimum release age policy)
- Branch rulesets → needs base `owner`/`repository` options
