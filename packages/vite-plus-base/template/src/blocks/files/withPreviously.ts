/**
 * PROTOTYPE — vendored from CTA. Transition mode: replace ci.yml with ci.yaml
 * only when existing content matches a known stale pattern or is absent.
 */
export function withPreviously(
  contents: string,
  _previousPaths: string[],
  _existingContent?: string,
): string {
  // TODO: implement CTA semantics — for now return new contents
  return contents;
}
