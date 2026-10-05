/**
 * PROTOTYPE — YAML formatter for workflow/action files (vendored/adapted from CTA).
 */
export function formatWorkflowYaml(value: Record<string, unknown>): string {
  // TODO: use yaml library with multiline run block handling
  return JSON.stringify(value, null, 2);
}
