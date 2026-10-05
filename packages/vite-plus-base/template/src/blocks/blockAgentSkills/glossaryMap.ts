import type { GlossaryMapEntry } from "../../../../src/workspace-config.ts";

export function formatGlossaryMap(glossaryMap: Record<string, GlossaryMapEntry>) {
  const hasSummaries = Object.values(glossaryMap).some((entry) => entry.summary);
  const rows = Object.entries(glossaryMap).map(([context, entry]) => {
    const adr = entry.adr ?? "";
    if (hasSummaries) {
      const summary = entry.summary ?? "";
      return `| ${context} | ${entry.glossary} | ${adr} | ${summary} |`;
    }

    return `| ${context} | ${entry.glossary} | ${adr} |`;
  });

  const header = hasSummaries
    ? "| Context | Glossary | ADR | Summary |"
    : "| Context | Glossary | ADR |";
  const separator = hasSummaries
    ? "| ------- | -------- | --- | ------- |"
    : "| ------- | -------- | --- |";

  return `# Glossary Map

Per-context glossaries for this monorepo. Read the glossary for each context relevant to your work.

${header}
${separator}
${rows.join("\n")}
`;
}
