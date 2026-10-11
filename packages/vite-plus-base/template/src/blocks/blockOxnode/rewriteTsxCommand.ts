export type TsxRewrite = {
  text: string;
  manual: string[];
};

const WATCH_FLAG = String.raw`tsx\s+watch\s+--(?:clear-screen|include|exclude)(?![\w-])`;
const WATCH_FLAGS =
  "tsx watch flags (--clear-screen, --include, --exclude) are not rewritten; oxnode --watch is Node's watch mode";
const LOADER_HOOK = "--loader tsx and --require tsx are not rewritten";
const UNRECOGNIZED = "unrecognized tsx command was left unchanged";

function unique(values: string[]) {
  return [...new Set(values)];
}

export function hasTsxCommand(text: string) {
  return /(?<![\w./-])tsx(?![\w./-])/.test(text);
}

function hasLoaderHook(text: string) {
  return /--(?:loader|require)(?:=|\s+)(['"]?)tsx(?:\/(?:esm|cjs))?\1(?![\w./-])/.test(text);
}

function hasUnsafeWatch(text: string) {
  return new RegExp(String.raw`(?<![\w./-])${WATCH_FLAG}`).test(text);
}

/**
 * Rewrites tsx runner invocations to oxnode.
 * File paths such as `src/App.tsx` are unchanged.
 * Commands that cannot be mapped are returned as-is and listed in `manual`.
 */
export function rewriteTsxCommand(input: string): TsxRewrite {
  const manual: string[] = [];
  let text = input;

  if (hasLoaderHook(text)) {
    manual.push(LOADER_HOOK);
  }

  text = text.replace(
    /--import(?:=|\s+)(['"]?)tsx(?:\/(?:esm|cjs))?\1(?![\w./-])/g,
    (match, quote: string) => {
      const separator = match.startsWith("--import=") ? "=" : " ";
      return `--import${separator}${quote}@oxc-node/core/register${quote}`;
    },
  );

  const allowWatchRewrite = !hasUnsafeWatch(text);
  if (!allowWatchRewrite && /(?<![\w./-])tsx\s+watch(?![\w-])/.test(text)) {
    manual.push(WATCH_FLAGS);
  }

  if (allowWatchRewrite) {
    text = text.replace(/(?<![\w./-])exec(\s+)tsx\s+watch(?![\w-])/g, "exec$1oxnode --watch");
    text = text.replace(/(?<![\w./-])npx(\s+)tsx\s+watch(?![\w-])/g, "oxnode --watch");
    text = text.replace(/(?<![\w./-])pnpm(\s+)tsx\s+watch(?![\w-])/g, "pnpm$1exec oxnode --watch");
    text = text.replace(/(?<![\w./-])yarn(\s+)tsx\s+watch(?![\w-])/g, "yarn$1oxnode --watch");
    text = text.replace(/(?<![\w./-])npm(\s+)tsx\s+watch(?![\w-])/g, "npm$1exec oxnode --watch");
    text = text.replace(/(^|&&|\|\||[;&|(`\n])(\s*)tsx\s+watch(?![\w-])/g, "$1$2oxnode --watch");
  }

  text = text.replace(/(?<![\w./-])exec(\s+)tsx(?![\w./-])(?!\s+watch\b)/g, "exec$1oxnode");
  text = text.replace(/(?<![\w./-])npx(\s+)tsx(?![\w./-])(?!\s+watch\b)/g, "oxnode");
  text = text.replace(/(?<![\w./-])pnpm(\s+)tsx(?![\w./-])(?!\s+watch\b)/g, "pnpm$1exec oxnode");
  text = text.replace(/(?<![\w./-])yarn(\s+)tsx(?![\w./-])(?!\s+watch\b)/g, "yarn$1oxnode");
  text = text.replace(/(?<![\w./-])npm(\s+)tsx(?![\w./-])(?!\s+watch\b)/g, "npm$1exec oxnode");
  text = text.replace(/(^|&&|\|\||[;&|(`\n])(\s*)tsx(?![\w./-])(?!\s+watch\b)/g, "$1$2oxnode");

  if (hasTsxCommand(text)) {
    manual.push(UNRECOGNIZED);
  }

  return { text, manual: unique(manual) };
}

export function rewritePackageScripts(scripts: Record<string, unknown> | undefined) {
  const manual: string[] = [];
  if (!scripts) {
    return { scripts, manual, changed: false, stillNeedsTsx: false };
  }

  let changed = false;
  let stillNeedsTsx = false;
  const next: Record<string, unknown> = {};

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string") {
      next[name] = command;
      continue;
    }

    const rewritten = rewriteTsxCommand(command);
    next[name] = rewritten.text;
    if (rewritten.text !== command) {
      changed = true;
    }
    if (hasTsxCommand(rewritten.text)) {
      stillNeedsTsx = true;
    }
    for (const reason of rewritten.manual) {
      manual.push(`script ${name}: ${reason}`);
    }
  }

  return { scripts: next, manual: unique(manual), changed, stillNeedsTsx };
}
