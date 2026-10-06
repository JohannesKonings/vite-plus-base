/**
 * PROTOTYPE — template.test.ts assertions for #9 (outline only, not runnable).
 *
 * Add helpers:
 *   readWorkflow(files, "ci.yaml")
 *   readCompositeAction(files, "prepare")
 *
 * describe("blockGitHubActionsCI") {
 *
 *   it("emits ci.yaml with setup-vp prepare and vp commands in setup mode", ...)
 *     - .github/workflows/ci.yaml exists (not .yml)
 *     - .github/actions/prepare/action.yaml uses voidzero-dev/setup-vp@v1.21.1
 *     - prepare has cache: true, run-install: false
 *     - prepare does NOT set node-version (reads devEngines.runtime from package.json)
 *     - ci job runs: vp install --frozen-lockfile, vp check, vp test, vp build
 *     - no pnpm/action-setup, no actions/setup-node
 *     - concurrency cancel-in-progress only on pull_request
 *
 *   it("uses vp run -r for package workspaces", ...)
 *     - files include pnpm-workspace.yaml
 *     - ci runs vp run -r test and vp run -r build
 *
 *   it("does not emit release.yaml for private app-only repo", ...)
 *     - private: true, no exports/files/bin
 *     - release.yaml absent
 *
 *   it("emits release.yaml when workspace child is publishable", ...)
 *     - root private: true, packages/lib with exports + build
 *     - release.yaml present, push main trigger, id-token: write
 *
 *   it("respects bingo.blockGitHubActionsCI.emitRelease override", ...)
 *
 *   it("removes legacy ci.yml during transition", ...)
 *     - blockRemoveFiles script includes .github/workflows/ci.yml
 *     - output uses ci.yaml
 * }
 */

export {};
