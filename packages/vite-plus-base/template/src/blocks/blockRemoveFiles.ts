import { z } from "zod";

import { base } from "../base.ts";

export const blockRemoveFiles = base.createBlock({
  about: {
    name: "Remove Files",
  },
  addons: {
    files: z.array(z.string()).optional(),
  },
  produce() {
    return {};
  },
  transition({ addons }) {
    if (!addons.files?.length) {
      return {};
    }

    return {
      scripts: [
        {
          phase: 1,
          // Bingo runs commands without a shell, so leave globs unquoted for find.
          commands: addons.files.map(
            (file) =>
              `find . -name ${file} -not -path */node_modules/* -not -path */.git/* -delete`,
          ),
          silent: true,
        },
      ],
    };
  },
});
