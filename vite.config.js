import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Détecte si on compile pour Electron (pas de base URL relative)
const isElectron = process.env.BUILD_TARGET === "electron";

export default defineConfig({
  plugins: [react()],
  base: isElectron ? "./" : "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true, // échoue proprement si 5173 est pris, au lieu de choisir un port aléatoire
    hmr: {
      port: 5173, // force le websocket HMR sur le même port
    },
  },
});
