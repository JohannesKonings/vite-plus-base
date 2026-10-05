#!/usr/bin/env node

process.argv.splice(2, 0, "--mode", "transition", "--preset", "default", "--directory", ".");

await import("./index.ts");
