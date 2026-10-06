import { base } from "../../base.ts";
import { MINIMUM_RELEASE_AGE_RENOVATE } from "../../constants/minimumReleaseAge.ts";

function createRenovateJson() {
  return (
    JSON.stringify(
      {
        $schema: "https://docs.renovatebot.com/renovate-schema.json",
        extends: ["config:recommended"],
        minimumReleaseAge: MINIMUM_RELEASE_AGE_RENOVATE,
        vulnerabilityAlerts: { enabled: true },
      },
      null,
      2,
    ) + "\n"
  );
}

export const blockRenovate = base.createBlock({
  about: {
    name: "Renovate",
  },
  produce() {
    return {
      files: {
        "renovate.json": createRenovateJson(),
      },
    };
  },
});
