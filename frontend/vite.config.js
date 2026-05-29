import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["weldix-logo.svg", "favicon.ico"],
      manifest: {
        name: "Weldix — Gestión de Taller",
        short_name: "Weldix",
        description: "Control total de tu taller de soldadura y calderería. Sin papel.",
        theme_color: "#020617",
        background_color: "#020617",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "es",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["business", "productivity"],
        shortcuts: [
          {
            name: "Trabajos",
            short_name: "OTs",
            url: "/app/trabajos",
            description: "Ver órdenes de trabajo",
          },
          {
            name: "Fichar",
            short_name: "Fichar",
            url: "/app/inicio",
            description: "Registrar entrada o salida",
          },
        ],
      },
      workbox: {
        // Cachea assets estáticos (JS, CSS, imágenes)
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Estrategia NetworkFirst para las llamadas a la API (datos siempre frescos)
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:8000\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutos
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: {
        // Activa el service worker también en dev para poder probar
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
  },
  optimizeDeps: {
    entries: ['src/**/*.{js,jsx}'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['node_modules'],
  },
});
