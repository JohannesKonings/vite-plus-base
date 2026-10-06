export type WorkspaceShape = "single-package" | "package-workspace";

export function detectWorkspaceShape(files: Record<string, unknown>): WorkspaceShape {
  if (files["pnpm-workspace.yaml"]) {
    return "package-workspace";
  }

  const packageJson = files["package.json"];
  if (typeof packageJson === "string") {
    try {
      const parsed = JSON.parse(packageJson) as { workspaces?: unknown };
      if (parsed.workspaces) {
        return "package-workspace";
      }
    } catch {
      // fall through
    }
  }

  return "single-package";
}
