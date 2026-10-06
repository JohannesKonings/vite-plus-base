export function createCiReleaseDoc() {
  return `# CI release: npm trusted publishing

The generated \`release.yaml\` workflow publishes committed package versions on push to \`main\` using **npm trusted publishing (OIDC)**. No publish secrets are required when trusted publishing is configured.

## One-time setup per package

For each publishable package:

1. Publish the first version manually from your machine (\`pnpm publish\` or \`npm publish\`).
2. On [npmjs.com](https://www.npmjs.com), open the package → **Settings** → **Trusted publishing** → **GitHub Actions**.
3. Configure:
   - **Organization or user** — your GitHub owner
   - **Repository** — this repository
   - **Workflow filename** — \`release.yaml\`
   - **Allowed actions** — \`npm publish\`
4. Ensure the package \`package.json\` has a \`repository\` field pointing at this GitHub repo.
5. After verifying CI publish works, enable **Require two-factor authentication and disallow tokens** under **Publishing access**.

Optional CLI (npm ≥11.15):

\`\`\`bash
npm trust github --file release.yaml --allow-publish
\`\`\`

## Optional GitHub environment gate

Set \`bingo.blockGitHubActionsCI.npmEnvironment\` in \`vite.config.ts\` to add an approval gate (for example \`npm\`). The environment name must match the trusted publisher configuration on npmjs.com.

## Token fallback

If trusted publishing is not available yet, set \`bingo.blockGitHubActionsCI.auth: 'token'\` and add an \`NPM_TOKEN\` repository secret with a granular **read and write (publish and stage)** token. Prefer migrating to OIDC when possible.
`;
}
