export function createReactViteModule(oxcCompiler: boolean) {
  if (oxcCompiler) {
    return `import react from "@vitejs/plugin-react";

/**
 * Vite 8 React plugin. JSX is transformed by Oxc, and the plugin enables Fast Refresh.
 *
 * Experimental: \`compiler: true\` runs oxc-transform-react, a Rust port of React
 * Compiler. The option and its output can change. See docs/agents/react-vite.md.
 *
 * Template-owned: \`vp run bingo\` regenerates this file from bingo.blockReact.
 */
export const reactPlugin = react({ compiler: true });
`;
  }

  return `import react from "@vitejs/plugin-react";

/**
 * Vite 8 React plugin. JSX is transformed by Oxc, and the plugin enables Fast Refresh.
 * React Compiler is off. See docs/agents/react-vite.md.
 *
 * Template-owned: \`vp run bingo\` regenerates this file from bingo.blockReact.
 */
export const reactPlugin = react();
`;
}

export function createReactViteDoc(oxcCompiler: boolean) {
  const compilerState = oxcCompiler
    ? "On. `tooling/vite/react.ts` calls `react({ compiler: true })`, and `oxc-transform-react` is installed."
    : "Off. `tooling/vite/react.ts` calls `react()` with no compiler.";

  return `# React on Vite 8

Opt in with \`bingo.blockReact\` in the root \`vite.config.ts\`. The template installs \`@vitejs/plugin-react\` (6.1.2 or newer in the catalog) and writes \`tooling/vite/react.ts\`.

\`@vitejs/plugin-react\` 6 transforms JSX with Oxc and enables Fast Refresh. Vite 8 already uses Oxc for TypeScript and JSX in the bundler. That is separate from React Compiler.

## Wire the plugin

\`\`\`ts
import { defineConfig } from "@jaykingson/vite-plus-base";
import { reactPlugin } from "./tooling/vite/react.ts";

export default defineConfig({
  plugins: [reactPlugin],
});
\`\`\`

In a package workspace, import it from the app package with a relative path, or copy the one-line \`react()\` call into that package's Vite config. pnpm does not expose the root devDependency to workspace packages. Transition adds \`@vitejs/plugin-react\` to a workspace package when that package already depends on \`react\`, \`react-dom\`, or \`@vitejs/plugin-react\`. Other packages need the devDependency added by hand.

An existing version specifier is kept, including \`catalog:\`. It needs to be \`@vitejs/plugin-react\` 6.1.2 or newer. With the compiler on, \`oxc-transform-react\` needs to be >= 0.152.

\`tooling/vite/react.ts\` is template-owned. The next transition overwrites it.

## React Compiler

**Experimental.** The Oxc React Compiler (\`oxc-transform-react\`) is a Rust port of React Compiler. It is off unless you opt in. APIs and output can change between releases.

Current setting: ${compilerState}

\`\`\`ts
export default defineWorkspaceConfig({
  bingo: {
    blockPackageJson: { name: "my-workspace" },
    blockReact: { oxcCompiler: true },
  },
});
\`\`\`

Then \`vp run bingo\`. \`oxcCompiler\` defaults to \`false\`. \`true\` installs the optional peer \`oxc-transform-react\` (>= 0.152, matching \`@vitejs/plugin-react\` 6.1.2) and sets \`react({ compiler: true })\`.

### Babel compiler

The Babel React Compiler preset still works, and it is the alternative when you do not want the experimental Oxc compiler. Install the optional peers yourself. This block does not add them, and it does not remove an existing Babel setup.

\`\`\`ts
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
});
\`\`\`

Peers: \`@rolldown/plugin-babel\`, \`babel-plugin-react-compiler\`, and \`@babel/core\`. With Babel 7 and TypeScript, also install \`@types/babel__core\`.
`;
}
