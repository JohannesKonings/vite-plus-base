/**
 * PROTOTYPE — implements #5 resolution.
 * Scans root + workspace package.json manifests from bingo files map.
 */
export interface PackageManifest {
  path: string;
  name?: string;
  private?: boolean;
  exports?: unknown;
  files?: unknown;
  bin?: unknown;
  scripts?: { build?: string; prepublishOnly?: string };
}

export function detectPublishablePackages(_files: Record<string, unknown>): PackageManifest[] {
  // TODO: collect manifests via pnpm-workspace.yaml / package.json#workspaces
  // Publishable when: private !== true, has exports|files|bin, has build|prepublishOnly
  return [];
}
