import { defineLibraryConfig } from "./src/index.ts";

export default defineLibraryConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      "template/bin/bingo": "template/bin/bingo.ts",
      "template/bin/index": "template/bin/index.ts",
    },
    exports: {
      bin: {
        "vite-plus-base-bingo": "./template/bin/bingo.ts",
        "vite-plus-base-template": "./template/bin/index.ts",
      },
    },
  },
});
