import { MINIMUM_RELEASE_AGE_PNPM_MINUTES } from "../../constants/minimumReleaseAge.ts";

const RELEASE_AGE_HEADER = [
  `minimumReleaseAge: ${MINIMUM_RELEASE_AGE_PNPM_MINUTES}`,
  "minimumReleaseAgeStrict: true",
] as const;

export function formatMinimalPnpmWorkspaceYaml() {
  return `${RELEASE_AGE_HEADER.join("\n")}\n`;
}

function stripReleaseAgeSettings(yaml: string) {
  return yaml.split("\n").filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed !== "" &&
      !trimmed.startsWith("minimumReleaseAge:") &&
      !trimmed.startsWith("minimumReleaseAgeStrict:")
    );
  });
}

export function mergePnpmWorkspaceYaml(existing: string) {
  const body = stripReleaseAgeSettings(existing);

  if (body.length === 0) {
    return formatMinimalPnpmWorkspaceYaml();
  }

  return `${[...RELEASE_AGE_HEADER, "", ...body].join("\n")}\n`;
}
