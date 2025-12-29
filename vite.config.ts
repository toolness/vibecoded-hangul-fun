import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // 1MB
  },
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
            // Audio files need RangeRequestsPlugin because browsers make range
            // requests for audio, and workbox needs to slice cached responses.
            urlPattern: /\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-offline-cache",
              rangeRequests: true,
              matchOptions: {
                // Ignore Vary header when matching - GitHub Pages adds
                // Vary: Accept-Encoding which can cause cache misses
                ignoreVary: true,
              },
            },
          },
          {
            // Images don't need range request handling
            urlPattern: /\.(?:webp|jpg|png)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-offline-cache",
              matchOptions: {
                ignoreVary: true,
              },
            },
          },
          {
            // S3-hosted audio files - also need range request handling
            urlPattern: /^https:\/\/.*\.s3\..*\.amazonaws\.com\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "media-offline-cache",
              rangeRequests: true,
              matchOptions: {
                ignoreVary: true,
              },
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
