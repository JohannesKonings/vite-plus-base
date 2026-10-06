/**
 * PROTOTYPE — scoped resolveUses (#8): only actions this template generates.
 */
const PINNED_ACTIONS: Record<string, string> = {
  "actions/checkout": "v4",
};

export function resolveUses(action: string, fallbackVersion: string): string {
  const version = PINNED_ACTIONS[action] ?? fallbackVersion;
  return `${action}@${version}`;
}
