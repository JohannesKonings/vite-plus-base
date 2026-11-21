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
  props: {
    files: z.array(z.string()).optional(),
  },
  produce() {
    return {};
  },
  transition({ props }) {
    if (!props.files?.length) {
      return {};
    }

    return {
      scripts: [
        {
          phase: 1,
          // Bingo runs commands without a shell, so leave globs unquoted for find.
          commands: props.files.flatMap((file) => removeCommands(file)),
          silent: true,
        },
      ],
    };
  },
});
