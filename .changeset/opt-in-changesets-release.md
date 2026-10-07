---
"@jaykingson/vite-plus-base": patch
---

Add an opt-in Changesets release mode to `blockGitHubActionsCI`. Set `bingo.blockGitHubActionsCI.release` to `"changesets"` to generate Changesets config, release scripts, and a workflow that opens a Version Packages pull request, then publishes, tags, and creates GitHub releases when that pull request merges.
