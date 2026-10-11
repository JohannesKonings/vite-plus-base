import { base } from "./base.ts";
import { presetDefault } from "./presets/default.ts";

export default base.createStratumTemplate({
  about: {
    name: "@jaykingson/vite-plus-base",
    description:
      "Add dependency-cruiser, an oxnode TypeScript runner, Matt Pocock agent skills, TypeScript, optional Vite 8 React, GitHub engineering setup, and VS Code workspace settings for vite-plus-base projects.",
  },
  presets: [presetDefault],
});
