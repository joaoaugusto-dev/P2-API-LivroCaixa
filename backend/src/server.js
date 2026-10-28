// PONTO DE ENTRADA do backend:  npm run dev  (reinicia ao salvar)  ou  npm start.
// Fluxo de uma requisição: server -> app (middlewares gerais) -> rotas do módulo -> controlador -> serviço -> banco.
import { env } from "./config/env.js";
import { criarApp } from "./app.js";
import { pool } from "./compartilhado/db.js";

// Só em localhost: a API não fica exposta na rede local
const servidor = criarApp().listen(env.porta, "127.0.0.1", () => {
  console.log(`API rodando em http://localhost:${env.porta}/api`);
});

// Fecha tudo direito quando o processo é encerrado
for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => servidor.close(() => pool.end().then(() => process.exit(0))));
}
