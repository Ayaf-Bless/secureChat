import { defineConfig } from "electron-vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: "electron/main.ts",
      },
      rollupOptions: {
        external: ["better-sqlite3"],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, "electron/preload.ts"),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer"),
      },
    },
    plugins: [react()],
  },
});
