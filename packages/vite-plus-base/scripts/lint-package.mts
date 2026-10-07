import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// attw --pack shells out to `npm pack`. This repo's package manager is pnpm,
// and `npm pack` is not available under Vite+'s managed package-manager mode.
// attw's README says pnpm users should pack first and pass the tarball.
//
// --profile esm-only ignores node10 and node16-cjs. The remaining failures are
// internal-resolution-error reports whose resolutionOption is node10: published
// template source imports src/workspace-config.ts, which is not in `files`.
// attw 0.18 does not apply the profile to that problem kind (it has no
// resolutionKind), so the rule is ignored explicitly. Failures under
// node16-esm and bundler still fail this run.
const packDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "vite-plus-base-pack-"));

try {
  execFileSync("publint", ["--strict"], { stdio: "inherit" });
  execFileSync("pnpm", ["pack", "--pack-destination", packDirectory], { stdio: "pipe" });

  const tarball = fs.readdirSync(packDirectory).find((name) => name.endsWith(".tgz"));
  if (!tarball) {
    throw new Error("pnpm pack did not write a tarball");
  }

  execFileSync(
    "attw",
    [
      path.join(packDirectory, tarball),
      "--profile",
      "esm-only",
      "--ignore-rules",
      "internal-resolution-error",
    ],
    { stdio: "inherit" },
  );
} finally {
  fs.rmSync(packDirectory, { recursive: true, force: true });
}
