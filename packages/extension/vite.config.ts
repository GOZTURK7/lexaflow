import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  // ─── Content script build (IIFE — content scripts cannot be ES modules) ───
  if (mode === "content") {
    return {
      plugins: [react()],
      define: { "process.env.NODE_ENV": '"production"' },
      build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, "src/content/index.tsx"),
          name: "LexaFlowContent",
          formats: ["iife"],
          fileName: () => "content.js",
        },
        rollupOptions: {
          output: { inlineDynamicImports: true },
        },
        cssCodeSplit: false,
        minify: true,
        sourcemap: false,
      },
    };
  }

  // ─── Background + Options build ───────────────────────────────────────────
  return {
    plugins: [react()],
    build: {
      outDir: "dist",
      emptyOutDir: false,
      rollupOptions: {
        input: {
          background: resolve(__dirname, "src/background/index.ts"),
          options: resolve(__dirname, "options/index.html"),
        },
        output: {
          entryFileNames: (chunk) =>
            chunk.name === "background" ? "background.js" : "options/[name].js",
          chunkFileNames: "options/chunks/[name]-[hash].js",
          assetFileNames: "options/assets/[name]-[hash][extname]",
        },
      },
      minify: true,
      sourcemap: false,
    },
  };
});
