// CONFIGURAÇÃO DO VITE: servidor de desenvolvimento do front-end e ponte (proxy) para a API Python.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite = servidor de desenvolvimento e empacotador do front-end
export default defineConfig({
  plugins: [react()],
  // O navegador chama /api/... e o Vite repassa para a API Python (localhost:8000), sem problema de CORS
  server: { proxy: { "/api": "http://localhost:8000" } },
});
