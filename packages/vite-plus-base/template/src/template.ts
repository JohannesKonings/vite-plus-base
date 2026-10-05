import { base } from "./base.ts";
import { presetDefault } from "./presets/default.ts";

export default base.createStratumTemplate({
  about: {
    name: "@jaykingson/vite-plus-base",
    description:
      "Add dependency-cruiser, project config, and agent skills for vite-plus-base projects.",
  },
  presets: [presetDefault],
});
