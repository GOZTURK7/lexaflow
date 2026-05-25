import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "LexaFlow",
        short_name: "LexaFlow",
        description: "Language learning dictionary for the open web",
        theme_color: "#0f172a",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        share_target: {
          action: "/share",
          method: "GET",
          params: { text: "text", title: "title", url: "url" },
        },
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:3001\/api\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "api-cache", expiration: { maxAgeSeconds: 86400 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
