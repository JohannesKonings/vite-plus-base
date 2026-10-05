const AGENT_SKILLS_HEADER = "## Agent skills";
const CANONICAL_SUBSECTIONS = ["Issue tracker", "Triage labels", "Domain docs"];

function canonicalSubsection(title: string, multiContext: boolean) {
  const domainSummary = multiContext
    ? "Multi-context: see `GLOSSARY-MAP.md` for per-context glossaries."
    : "Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root.";

  switch (title) {
    case "Issue tracker":
      return `### Issue tracker

Issues live in GitHub Issues. Use the \`gh\` CLI. See \`docs/agents/issue-tracker.md\`.
`;
    case "Triage labels":
      return `### Triage labels

Canonical triage labels: \`needs-triage\`, \`needs-info\`, \`ready-for-agent\`, \`ready-for-human\`, \`wontfix\`. See \`docs/agents/triage-labels.md\`.
`;
    case "Domain docs":
      return `### Domain docs

${domainSummary} See \`docs/agents/domain.md\`.
`;
    default:
      return "";
  }
}

export function agentSkillsSection(multiContext: boolean) {
  const subsections = CANONICAL_SUBSECTIONS.map((title) =>
    canonicalSubsection(title, multiContext).trimEnd(),
  );

  return `${AGENT_SKILLS_HEADER}

${subsections.join("\n\n")}
`;
}

function parseSubsections(sectionBody: string) {
  const subsections = new Map<string, string>();

  for (const part of sectionBody.split(/^### /m)) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const newlineIndex = trimmed.indexOf("\n");
    const title = (newlineIndex === -1 ? trimmed : trimmed.slice(0, newlineIndex)).trim();
    const body = newlineIndex === -1 ? "" : trimmed.slice(newlineIndex + 1).trimEnd();

    if (!title) {
      continue;
    }

    subsections.set(title, body);
  }

  return subsections;
}

function patchAgentSkillsSectionBody(sectionBody: string, multiContext: boolean) {
  const existing = parseSubsections(sectionBody);
  const blocks = CANONICAL_SUBSECTIONS.map((title) =>
    canonicalSubsection(title, multiContext).trimEnd(),
  );

  for (const [title, body] of existing) {
    if (!CANONICAL_SUBSECTIONS.includes(title)) {
      blocks.push(`### ${title}${body ? `\n\n${body}` : ""}`);
    }
  }

  return `\n\n${blocks.join("\n\n")}\n`;
}

export function patchAgentsMd(existing: string | undefined, multiContext: boolean) {
  if (!existing) {
    return `${agentSkillsSection(multiContext)}\n`;
  }

  const headerIndex = existing.indexOf(AGENT_SKILLS_HEADER);
  if (headerIndex === -1) {
    const separator = existing.endsWith("\n") ? "" : "\n";
    return `${existing}${separator}\n${agentSkillsSection(multiContext)}\n`;
  }

  const afterHeader = existing.slice(headerIndex + AGENT_SKILLS_HEADER.length);
  const nextHeadingMatch = /\n## [^\n]/.exec(afterHeader);
  const sectionEnd = nextHeadingMatch
    ? headerIndex + AGENT_SKILLS_HEADER.length + nextHeadingMatch.index
    : existing.length;
  const sectionBody = existing.slice(headerIndex + AGENT_SKILLS_HEADER.length, sectionEnd);
  const before = existing.slice(0, headerIndex).replace(/\n+$/, "");
  const after = existing.slice(sectionEnd).replace(/^\n+/, "");
  const patchedSection = `${AGENT_SKILLS_HEADER}${patchAgentSkillsSectionBody(sectionBody, multiContext)}`;

  return `${before}\n\n${patchedSection}${after ? `\n\n${after}` : ""}\n`;
}
