// CONFIGURAÇÃO DO VITE: servidor de desenvolvimento do front-end e ponte (proxy) para a API Node.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite = servidor de desenvolvimento e empacotador do front-end
export default defineConfig({
  plugins: [react()],
  // O navegador chama /api/... e o Vite repassa para a API Node (localhost:3333), sem problema de CORS
  server: { proxy: { "/api": "http://localhost:3333" } },
});
