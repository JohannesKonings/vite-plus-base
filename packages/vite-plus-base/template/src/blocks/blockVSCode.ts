import { z } from "zod";

import { base } from "../base.ts";
import { intakeFile } from "./intake/intakeFile.ts";
import { intakeFileAsJson } from "./intake/intakeFileAsJson.ts";

const VSCODE_SETTINGS_PATH = [".vscode", "settings.json"];
const VSCODE_EXTENSIONS_PATH = [".vscode", "extensions.json"];
export const TYPESCRIPT_NATIVE_PREVIEW_EXTENSION = "typescriptteam.native-preview";
export const TYPESCRIPT_SDK_PATH = "./node_modules/typescript";

const workspaceTypeScriptSettings = {
  "js/ts.experimental.useTsgo": true,
  "js/ts.tsdk.path": TYPESCRIPT_SDK_PATH,
  "json.schemaDownload.enable": true,
};

const removedTypeScriptSettings = [
  ...Object.keys(workspaceTypeScriptSettings),
  "typescript.tsdk",
  "typescript.experimental.useTsgo",
  "js/ts.tsdk.promptToUseWorkspaceVersion",
  "typescript.enablePromptUseWorkspaceTsdk",
];

function formatVsCodeSettings(existing: Record<string, unknown> | undefined) {
  const rest = { ...existing };
  for (const key of removedTypeScriptSettings) {
    delete rest[key];
  }

  return `${JSON.stringify({ ...workspaceTypeScriptSettings, ...rest }, null, 2)}\n`;
}

function formatExtensionsJson(existing: { recommendations?: string[] } | undefined) {
  const recommendations = [
    ...new Set([...(existing?.recommendations ?? []), TYPESCRIPT_NATIVE_PREVIEW_EXTENSION]),
  ].sort();

  return `${JSON.stringify({ recommendations }, null, 2)}\n`;
}

function vscodeFiles(
  existingSettings: Record<string, unknown> | undefined,
  existingExtensions: { recommendations?: string[] } | undefined,
) {
  return {
    ".vscode": {
      "settings.json": formatVsCodeSettings(existingSettings),
      "extensions.json": formatExtensionsJson(existingExtensions),
    },
  };
}

function blockVSCodeCreation({
  addons,
}: {
  addons: {
    settings?: Record<string, unknown>;
    extensions?: { recommendations?: string[] };
    skip?: boolean;
  };
}) {
  if (addons.skip) {
    return {
      suggestions: [
        `Could not update .vscode/settings.json. Set "js/ts.experimental.useTsgo" to true and "js/ts.tsdk.path" to "${TYPESCRIPT_SDK_PATH}". Install the ${TYPESCRIPT_NATIVE_PREVIEW_EXTENSION} extension.`,
      ],
    };
  }

  return {
    files: vscodeFiles(addons.settings, addons.extensions),
    suggestions: [
      `Install the recommended ${TYPESCRIPT_NATIVE_PREVIEW_EXTENSION} extension, then run TypeScript: Enable TypeScript 7.`,
    ],
  };
}

export const blockVSCode = base.createBlock({
  about: {
    name: "VS Code",
  },
  addons: {
    settings: z.record(z.string(), z.unknown()).optional(),
    extensions: z
      .object({
        recommendations: z.array(z.string()).optional(),
      })
      .optional(),
    skip: z.boolean().optional(),
  },
  intake({ files }) {
    const packageData = intakeFileAsJson(files, ["package.json"]);
    const existingSettings = intakeFile(files, VSCODE_SETTINGS_PATH);
    const existingExtensions = intakeFileAsJson(files, VSCODE_EXTENSIONS_PATH) as
      | { recommendations?: string[] }
      | undefined;
    let settings: Record<string, unknown> | undefined;
    let skip: boolean | undefined;

    if (existingSettings) {
      try {
        const parsed = JSON.parse(existingSettings[0]) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          skip = true;
        } else {
          settings = parsed as Record<string, unknown>;
        }
      } catch {
        skip = true;
      }
    }

    if (!packageData && !existingSettings && !existingExtensions) {
      return undefined;
    }

    return { settings, extensions: existingExtensions, skip };
  },
  produce(context) {
    return blockVSCodeCreation(context);
  },
  transition(context) {
    return blockVSCodeCreation(context);
  },
});
