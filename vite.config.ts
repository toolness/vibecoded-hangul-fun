import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Cache everything except the large media assets (audio/images).
        // Those are cached on-demand via the explicit offline download feature.
        globPatterns: ["**/*"],
        globIgnores: ["**/*.mp3", "**/*.webp", "**/*.jpg", "**/*.png"],
        // Runtime caching for media files - uses the same cache as our manual download feature
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp3|webp|jpg|png)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-offline-cache",
            },
          },
          {
            // S3-hosted audio files
            urlPattern: /^https:\/\/.*\.s3\..*\.amazonaws\.com\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-offline-cache",
            },
          },
        ],
      },
      includeAssets: ["**/*"],
    }),
  ],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
});
