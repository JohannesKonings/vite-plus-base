/** PROTOTYPE — stable job id from display name (vendored from CTA). */
export function createJobName(displayName: string): string {
  return displayName.toLowerCase().replaceAll(/\W+/gu, "_");
}
