import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://alessandrolollo.github.io",
  base: process.env.PUBLIC_BASE_PATH ?? "/alelollo-online-cv",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
