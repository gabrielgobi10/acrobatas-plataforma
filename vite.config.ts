import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@company": path.resolve(__dirname, "src/components/company"),
    },
  },

  // 🔹 ISSO AQUI É O IMPORTANTE PRO CAPACITOR
  base: "./",

  server: {
    port: 5173,
    open: true,
    hmr: {
      overlay: false,
    },
  },
});
