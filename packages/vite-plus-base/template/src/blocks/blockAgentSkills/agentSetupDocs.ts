export const issueTrackerGithubDoc = `# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the \`gh\` CLI for all operations.

## Conventions

- **Create an issue**: \`gh issue create --title "..." --body "..."\`. Use a heredoc for multi-line bodies.
- **Read an issue**: \`gh issue view --comments\`, filtering comments by \`jq\` and also fetching labels.
- **List issues**: \`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'\` with appropriate \`--label\` and \`--state\` filters.
- **Comment on an issue**: \`gh issue comment --body "..."\`
- **Apply / remove labels**: \`gh issue edit --add-label "..."\` / \`--remove-label "..."\`
- **Close**: \`gh issue close --comment "..."\`

Infer the repo from \`git remote -v\`; \`gh\` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to \`yes\` if this repo treats external PRs as feature requests; \`/triage\` reads this flag.)_

When set to \`yes\`, PRs run through the same labels and states as issues, using the \`gh pr\` equivalents:

- **Read a PR**: \`gh pr view --comments\` and \`gh pr diff \` for the diff.
- **List external PRs for triage**: \`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments\` then keep only \`authorAssociation\` of \`CONTRIBUTOR\`, \`FIRST_TIME_CONTRIBUTOR\`, or \`NONE\` (drop \`OWNER\`/\`MEMBER\`/\`COLLABORATOR\`).
- **Comment / label / close**: \`gh pr comment\`, \`gh pr edit --add-label\`/\`--remove-label\`, \`gh pr close\`.

GitHub shares one number space across issues and PRs, so a bare \`#42\` may be either: resolve with \`gh pr view 42\` and fall back to \`gh issue view 42\`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run \`gh issue view --comments\`.

## Wayfinding operations

Used by \`/wayfinder\`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled \`wayfinder:map\`, holding the Notes / Decisions-so-far / Fog body. \`gh issue create --label wayfinder:map\`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (\`gh api\` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put \`Part of # \` at the top of the child body. Labels: \`wayfinder: \` (\`research\`/\`prototype\`/\`grilling\`/\`task\`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with \`gh api --method POST repos/ / /issues/ /dependencies/blocked_by -F issue_id= \`, where \` \` is the blocker's numeric **database id** (\`gh api repos/ / /issues/ --jq .id\`, _not_ the \`#number\` or \`node_id\`). GitHub reports \`issue_dependencies_summary.blocked_by\` (open blockers only, the live gate). Where dependencies aren't available, fall back to a \`Blocked by: #, # \` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (\`gh issue list --state open\`, scoped to the map's sub-issues / task list), drop any with an open blocker (\`issue_dependencies_summary.blocked_by > 0\`, or an open issue in the \`Blocked by\` line) or an assignee; first in map order wins.
- **Claim**: \`gh issue edit --add-assignee @me\`, the session's first write.
- **Resolve**: \`gh issue comment --body " "\`, then \`gh issue close \`, then append a context pointer (gist + link) to the map's Decisions-so-far.
`;

export const triageLabelsDoc = `# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning |
| -------------------------- | -------------------- | ---------------------------------------- |
| \`needs-triage\` | \`needs-triage\` | Maintainer needs to evaluate this issue |
| \`needs-info\` | \`needs-info\` | Waiting on reporter for more information |
| \`ready-for-agent\` | \`ready-for-agent\` | Fully specified, ready for an AFK agent |
| \`ready-for-human\` | \`ready-for-human\` | Requires human implementation |
| \`wontfix\` | \`wontfix\` | Will not be actioned |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.
`;

export const domainDoc = `# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **\`GLOSSARY.md\`** at the repo root, or
- **\`GLOSSARY-MAP.md\`** at the repo root if it exists: it points at one \`GLOSSARY.md\` per context. Read each one relevant to the topic.
- **\`docs/adr/\`**: read ADRs that touch the area you're about to work in. In multi-context repos, also check \`src/<context>/docs/adr/\` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The \`/domain-modeling\` skill (reached via \`/grill-with-docs\` and \`/improve-codebase-architecture\`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

\`\`\`
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
\`\`\`

Multi-context repo (presence of \`GLOSSARY-MAP.md\` at the root):

\`\`\`
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
\`\`\`

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in \`GLOSSARY.md\`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for \`/domain-modeling\`).
`;

export function agentSetupFiles() {
  return {
    docs: {
      agents: {
        "issue-tracker.md": issueTrackerGithubDoc,
        "triage-labels.md": triageLabelsDoc,
        "domain.md": domainDoc,
      },
    },
  };
}
