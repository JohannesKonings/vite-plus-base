import { glossaryMapEntrySchema, glossaryMapSchema } from "../../../../src/workspace-config.ts";

function parseStringProperty(literal: string, property: string): string | undefined {
  const match = literal.match(new RegExp(`\\b${property}:\\s*["']([^"']+)["']`));
  return match?.[1];
}

export function parseGlossaryMap(literal: string) {
  const entries: Record<string, { glossary: string; adr?: string; summary?: string }> = {};
  const entryPattern = /(?:"([^"]+)"|'([^']+)'|([\w-]+))\s*:\s*\{([^{}]*)\}/g;

  for (const match of literal.matchAll(entryPattern)) {
    const context = match[1] ?? match[2] ?? match[3];
    const body = match[4];
    const glossary = parseStringProperty(body, "glossary");

    if (!glossary) {
      continue;
    }

    entries[context] = glossaryMapEntrySchema.parse({
      glossary,
      adr: parseStringProperty(body, "adr"),
      summary: parseStringProperty(body, "summary"),
    });
  }

  if (Object.keys(entries).length === 0) {
    return undefined;
  }

  return glossaryMapSchema.parse(entries);
}
