import {
  bingoConfigSchema,
  blockAgentSkillsConfigSchema,
  blockPackageJsonConfigSchema,
  type BingoConfig,
} from "../../../../src/workspace-config.ts";
import { intakeFile } from "./intakeFile.ts";
import { parseGlossaryMap } from "./parseGlossaryMap.ts";

function extractBracedObject(source: string, openBraceIndex: number): string | undefined {
  let depth = 0;

  for (let index = openBraceIndex; index < source.length; index++) {
    const character = source[index];
    if (character === "{") {
      depth++;
    } else if (character === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(openBraceIndex, index + 1);
      }
    }
  }

  return undefined;
}

function extractDefineWorkspaceConfigBody(content: string): string | undefined {
  const match = /defineWorkspaceConfig\s*\(\s*\{/.exec(content);
  if (!match) {
    return undefined;
  }

  const openBraceIndex = match.index + match[0].length - 1;
  return extractBracedObject(content, openBraceIndex);
}

function extractPropertyObject(source: string, property: string): string | undefined {
  const match = new RegExp(`\\b${property}\\s*:\\s*\\{`).exec(source);
  if (!match) {
    return undefined;
  }

  const openBraceIndex = match.index + match[0].length - 1;
  return extractBracedObject(source, openBraceIndex);
}

function parseStringProperty(literal: string, property: string): string | undefined {
  const match = literal.match(new RegExp(`\\b${property}:\\s*["']([^"']+)["']`));
  return match?.[1];
}

function parseBlockAgentSkills(literal: string | undefined) {
  if (!literal) {
    return undefined;
  }

  const glossaryMapLiteral = extractPropertyObject(literal, "glossaryMap");
  if (!glossaryMapLiteral) {
    return blockAgentSkillsConfigSchema.parse({});
  }

  return blockAgentSkillsConfigSchema.parse({
    glossaryMap: parseGlossaryMap(glossaryMapLiteral),
  });
}

export function intakeWorkspaceBingo(files: Record<string, unknown>): BingoConfig | undefined {
  const result = intakeFile(files, ["vite.config.ts"]);
  if (!result) {
    return undefined;
  }

  const [content] = result;
  const configBody = extractDefineWorkspaceConfigBody(content);
  if (!configBody) {
    return undefined;
  }

  const bingoLiteral = extractPropertyObject(configBody, "bingo");
  if (!bingoLiteral) {
    return undefined;
  }

  const blockPackageJsonLiteral = extractPropertyObject(bingoLiteral, "blockPackageJson");
  if (!blockPackageJsonLiteral) {
    throw new Error("Missing blockPackageJson in workspace bingo config");
  }

  const blockPackageJson = blockPackageJsonConfigSchema.parse({
    name: parseStringProperty(blockPackageJsonLiteral, "name"),
  });

  const blockAgentSkillsLiteral = extractPropertyObject(bingoLiteral, "blockAgentSkills");

  return bingoConfigSchema.parse({
    blockPackageJson,
    blockAgentSkills: parseBlockAgentSkills(blockAgentSkillsLiteral),
  });
}
