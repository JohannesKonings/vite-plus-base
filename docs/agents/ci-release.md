# CI release: Changesets

The generated `release.yaml` workflow releases public packages with [Changesets](https://github.com/changesets/changesets) and **npm trusted publishing (OIDC)**. Private packages are not versioned, tagged, or published.

## Add a changeset

In a pull request that should ship:

```bash
vp run changeset
```

Commit the file added under `.changeset/`.

## Version Packages pull request

A push to `main` that includes changesets opens or updates a pull request titled **Version Packages**. Merging it is the release. The pull request bumps versions and writes each package's `CHANGELOG.md`, with links to the merged pull requests and commits.

## Publish

Merging **Version Packages** runs this workflow again. It runs `vp check`, tests, and build, plus `lint:package` when that script exists, then publishes to npm, pushes git tags, and creates a GitHub release for each published package. Release notes are that version's changelog section.

## One-time GitHub setting

Under **Settings → Actions → General**, enable **Allow GitHub Actions to create and approve pull requests**. The workflow's `GITHUB_TOKEN` needs this to open the Version Packages pull request.

Installing the [Changesets bot](https://github.com/apps/changeset-bot) is optional. It comments on pull requests that do not add a changeset.

## One-time npm trusted publishing

For each publishable package:

1. Publish the first version manually from your machine (`pnpm publish` or `npm publish`).
2. On [npmjs.com](https://www.npmjs.com), open the package → **Settings** → **Trusted publishing** → **GitHub Actions**.
3. Configure:
   - **Organization or user** — your GitHub owner
   - **Repository** — this repository
   - **Workflow filename** — `release.yaml`
   - **Allowed actions** — `npm publish`
4. Ensure the package `package.json` has a `repository` field pointing at this GitHub repo. Set `bingo.blockGitHubActionsCI.repository` to `owner/name` when that field is missing.
5. After verifying CI publish works, enable **Require two-factor authentication and disallow tokens** under **Publishing access**.

Optional CLI (npm ≥11.15):

```bash
npm trust github --file release.yaml --allow-publish
```

## Optional GitHub environment gate

Set `bingo.blockGitHubActionsCI.npmEnvironment` in `vite.config.ts` to add an approval gate (for example `npm`). The environment name must match the trusted publisher configuration on npmjs.com.

## Token fallback

If trusted publishing is not available yet, set `bingo.blockGitHubActionsCI.auth: 'token'` and add an `NPM_TOKEN` repository secret with a granular **read and write (publish and stage)** token. Prefer migrating to OIDC when possible.
