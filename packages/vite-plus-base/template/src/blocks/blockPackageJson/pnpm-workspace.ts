import {
  MINIMUM_RELEASE_AGE_EXCLUDE_PACKAGE,
  MINIMUM_RELEASE_AGE_PNPM_MINUTES,
} from "../../constants/minimumReleaseAge.ts";

const RELEASE_AGE_HEADER = [
  `minimumReleaseAge: ${MINIMUM_RELEASE_AGE_PNPM_MINUTES}`,
  "minimumReleaseAgeStrict: true",
  "minimumReleaseAgeExclude:",
  `  - '${MINIMUM_RELEASE_AGE_EXCLUDE_PACKAGE}'`,
] as const;

export function formatMinimalPnpmWorkspaceYaml() {
  return `${RELEASE_AGE_HEADER.join("\n")}\n`;
}

function stripReleaseAgeSettings(yaml: string) {
  let skippingExcludeList = false;

  return yaml.split("\n").filter((line) => {
    const trimmed = line.trim();

    if (
      trimmed.startsWith("minimumReleaseAge:") ||
      trimmed.startsWith("minimumReleaseAgeStrict:")
    ) {
      skippingExcludeList = false;
      return false;
    }

    if (trimmed.startsWith("minimumReleaseAgeExclude:")) {
      skippingExcludeList = true;
      return false;
    }

    if (skippingExcludeList && trimmed.startsWith("- ")) {
      return false;
    }

    skippingExcludeList = false;
    return trimmed !== "";
  });
}

export function mergePnpmWorkspaceYaml(existing: string) {
  const body = stripReleaseAgeSettings(existing);

  if (body.length === 0) {
    return formatMinimalPnpmWorkspaceYaml();
  }

  return `${[...RELEASE_AGE_HEADER, "", ...body].join("\n")}\n`;
}
