# TypeScript runner (oxnode)

Node scripts run with [`oxnode`](https://oxc.rs/docs/guide/usage/oxc-node) from `@oxc-node/cli`, instead of `tsx`. Vite already transforms TypeScript for the bundler. `oxnode` is for scripts, CDK apps, and other Node entry points.

The runner is experimental and strips types. It does not type-check. Keep `vp check` (or `tsc` / `tsgo`) for type checking.

## Commands

```bash
oxnode file.ts
oxnode --watch file.ts
vp exec oxnode file.ts
node --import @oxc-node/core/register file.ts
```

`@oxc-node/core` is a direct devDependency so `node --import @oxc-node/core/register` resolves under pnpm. `@oxc-node/cli` depends on the same core version. Its `oxnode` binary is the usual entry point.

## What transition rewrites

Setup and transition add `@oxc-node/cli` and `@oxc-node/core` to the root `package.json`. They remove `tsx` when intaken scripts and `cdk.json` commands no longer call it. Known commands are rewritten:

| Before                                         | After                                   |
| ---------------------------------------------- | --------------------------------------- |
| `tsx file.ts`                                  | `oxnode file.ts`                        |
| `tsx watch file.ts`                            | `oxnode --watch file.ts`                |
| `node --import tsx`                            | `node --import @oxc-node/core/register` |
| `node --import tsx/esm` or `tsx/cjs`           | `node --import @oxc-node/core/register` |
| `vp exec tsx`, `pnpm exec tsx`, `npm exec tsx` | the same command with `oxnode`          |
| `pnpm tsx`                                     | `pnpm exec oxnode`                      |
| `npm tsx`                                      | `npm exec oxnode`                       |
| `npx tsx`                                      | `oxnode`                                |
| `yarn tsx`                                     | `yarn oxnode`                           |

Replacements apply to root `package.json` scripts, workspace package `scripts`, and string commands in `cdk.json` at the repo root or beside a workspace package (including `app`). Paths such as `src/App.tsx` stay as they are.

`npx tsx` becomes `oxnode` because the package is installed locally. The npm package is `@oxc-node/cli`; the binary is `oxnode`. Outside a repo, run `npx --package=@oxc-node/cli oxnode`.

Workspace packages gain `@oxc-node/cli` and `@oxc-node/core` when one of their scripts or their sibling `cdk.json` was rewritten, or when `tsx` was removed from that package. Other workspace packages are left alone.

## Manual migration

These stay in place. Transition prints them when it can see them:

- `tsx watch` options that are not Node's watch mode: `--clear-screen`, `--include`, `--exclude`
- `--loader tsx` and `--require tsx`
- `pnpm dlx tsx`, `npx --yes tsx`, and any other `tsx` token that is not the command itself
- Programmatic use (`import ... from "tsx"`, `register()`)
- GitHub workflows, Dockerfiles, shell scripts, Makefiles, and docs
- `cdk.json` files that are not at the repo root and not next to a workspace `package.json`

A script that still calls `tsx` keeps the `tsx` dependency. Remove that dependency after the leftover calls are gone. If a workflow still calls `tsx` and the package scripts no longer do, add `tsx` back or update the workflow before the next install.

## Caveats

- **No type checking.** `oxnode` transforms TypeScript and JSX. It does not report type errors.
- **`.cts` is CommonJS.** Those files are parsed as CommonJS, so `import` and `export` fail. Use `require` / `module.exports`, or rename the file to `.ts` or `.mts`.
- **Dependencies in `node_modules` are not transformed** unless `OXC_TRANSFORM_ALL=1`.
- **There is no `tsx watch` subcommand.** Watch mode is Node's flag: `oxnode --watch file.ts`.
- **No `engines` field.** `@oxc-node/cli` and `@oxc-node/core` through 0.1.6 do not declare `engines`.
- **Paths and JSX.** The runner reads `tsconfig.json` from the working directory. Set `OXC_TSCONFIG_PATH` or `TS_NODE_PROJECT` to use another file. `paths` and JSX settings are honored.
