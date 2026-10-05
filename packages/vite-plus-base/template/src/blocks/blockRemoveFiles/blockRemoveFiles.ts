import { z } from "zod";

import { base } from "../../base.ts";

function removeCommands(file: string) {
  if (file.includes("/")) {
    return [
      `find . -path '*/${file}/*' -not -path '*/node_modules/*' -not -path '*/.git/*' -delete`,
      `find . -type d -path '*/${file}' -not -path '*/node_modules/*' -not -path '*/.git/*' -delete`,
    ];
  }

  return [`find . -name ${file} -not -path '*/node_modules/*' -not -path '*/.git/*' -delete`];
}

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
          commands: addons.files.flatMap((file) => removeCommands(file)),
          silent: true,
        },
      ],
    };
  },
});
