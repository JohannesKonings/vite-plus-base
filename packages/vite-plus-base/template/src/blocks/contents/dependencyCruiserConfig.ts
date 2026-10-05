export const projectDependencyCruiserConfig = `/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: "dependency-cruiser/configs/recommended",
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
`;

export const dependencyCruiserSkill = `---
name: dependency-cruiser
description: Analyze module dependencies and enforce architecture rules with dependency-cruiser. Use when adding imports, refactoring modules, checking for circular deps, or running depcruise.
---

# Dependency Cruiser

This project uses dependency-cruiser via \`@jaykingson/vite-plus-base\`.

## Configuration

- Project config: \`.dependency-cruiser.cjs\`
- Uses the recommended rule set with TypeScript and Vite-friendly module resolution

## Commands

\`\`\`bash
pnpm exec depcruise src
pnpm exec depcruise src --output-type err
pnpm exec depcruise src --output-type dot | dot -T svg > dependencygraph.svg
\`\`\`

## Rules enforced

- **no-circular**: warns about circular dependencies
- **no-orphans**: warns about modules not reachable from the dependency graph
- **not-to-unresolvable**: errors on imports that cannot be resolved
- **not-to-deprecated**: warns when importing deprecated npm packages

## When editing dependencies

Before adding cross-layer imports or new entry points, run depcruise to validate the change does not introduce cycles or orphan modules.

Shared rules live in \`.dependency-cruiser.cjs\`. Re-run the template in transition mode after upgrading \`@jaykingson/vite-plus-base\` to refresh them.
`;
