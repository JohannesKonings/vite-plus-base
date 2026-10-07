import { removeUsesQuotes } from "./removeUsesQuotes.ts";

function indentLine(level: number, line: string) {
  return `${"  ".repeat(level)}${line}`;
}

function formatScalar(value: string, level: number, key?: string): string {
  if (key === "uses") {
    return value;
  }

  if (value.includes("\n") && key === "run") {
    const lines = value.split("\n");
    return `|\n${lines.map((line) => indentLine(level + 1, line)).join("\n")}`;
  }

  if (
    value === "" ||
    /[:#@`,[\]{}>&*!|>'"%\\]/.test(value) ||
    /^\s/.test(value) ||
    /^(true|false|null|~|yes|no|on|off)$/i.test(value)
  ) {
    return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
  }

  return value;
}

function formatValue(value: unknown, level: number, key?: string): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return formatScalar(value, level, key);
  }

  if (Array.isArray(value)) {
    return `\n${formatSequence(value, level)}`;
  }

  if (value && typeof value === "object") {
    return `\n${formatMapping(value as Record<string, unknown>, level + 1)}`;
  }

  return JSON.stringify(value);
}

function formatMapping(value: Record<string, unknown>, level: number): string {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) {
    return "";
  }

  const lines = entries.map(([key, entry]) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const nested = formatMapping(entry as Record<string, unknown>, level + 1);
      return nested ? `${indentLine(level, `${key}:`)}\n${nested}` : indentLine(level, `${key}:`);
    }

    if (Array.isArray(entry)) {
      const nested = formatSequence(entry, level + 1);
      return `${indentLine(level, `${key}:`)}\n${nested}`;
    }

    const formatted = formatValue(entry, level + 1, key);
    return indentLine(level, `${key}: ${formatted}`);
  });

  return lines.join("\n");
}

function formatSequenceEntry(
  indentLevel: number,
  label: string,
  value: unknown,
  key: string,
  formatLevel: number,
): string {
  const formatted = formatValue(value, formatLevel, key);
  if (formatted.startsWith("\n")) {
    return `${indentLine(indentLevel, `${label}:`)}${formatted}`;
  }

  return indentLine(indentLevel, `${label}: ${formatted}`);
}

function formatSequence(items: unknown[], level: number): string {
  return items
    .map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const entries = Object.entries(item as Record<string, unknown>);
        const [firstKey, firstValue] = entries[0];
        const lines = [
          formatSequenceEntry(level, `- ${firstKey}`, firstValue, firstKey, level + 1),
          ...entries
            .slice(1)
            .map(([key, value]) => formatSequenceEntry(level + 1, key, value, key, level + 1)),
        ];
        return lines.join("\n");
      }

      return indentLine(level, `- ${formatValue(item, level + 1)}`);
    })
    .join("\n");
}

export function formatWorkflowYaml(value: Record<string, unknown>): string {
  const yaml = formatMapping(value, 0);
  return `${removeUsesQuotes(yaml)}\n`;
}
