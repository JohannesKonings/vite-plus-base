import { base } from "./base.ts";
import { presetDefault } from "./presets/default.ts";

export default base.createStratumTemplate({
  about: {
    name: "@jaykingson/vite-plus-base",
    description:
      "Add dependency-cruiser, Matt Pocock agent skills, TypeScript, GitHub engineering setup, and VS Code workspace settings for vite-plus-base projects.",
  },
  presets: [presetDefault],
});
