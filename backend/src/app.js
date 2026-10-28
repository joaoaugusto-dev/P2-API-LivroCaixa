// Monta o Express: segurança, rotas de cada módulo e tratamento de erros.
// Separado do server.js para os testes conseguirem subir o app sem abrir porta fixa.
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { registrar } from "./compartilhado/middlewares/registrar.js";
import { rotaNaoEncontrada, tratarErros } from "./compartilhado/middlewares/tratarErros.js";

import authRotas from "./modulos/auth/auth.rotas.js";
import movimentacoesRotas from "./modulos/movimentacoes/movimentacoes.rotas.js";
import categoriasRotas from "./modulos/categorias/categorias.rotas.js";
import importacaoRotas from "./modulos/importacao/importacao.rotas.js";
import exportacaoRotas from "./modulos/exportacao/exportacao.rotas.js";

// Cria o servidor. A ORDEM dos app.use importa: cada requisição passa por eles de cima para baixo.
export function criarApp() {
  const app = express();

  app.disable("x-powered-by");
  // Mostra cada chamada no console (método, rota, código e descrição)
  app.use(registrar);
  // Cabeçalhos de segurança padrão (X-Frame-Options, HSTS etc.)
  app.use(helmet());
  // Só o front-end liberado em CORS_ORIGENS pode chamar a API do navegador
  app.use(cors({ origin: env.corsOrigens, exposedHeaders: ["Content-Disposition"] }));
  // Limite geral por IP (proteção contra abuso/robôs): 300 pedidos por minuto
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === "test", message: { erro: "Muitas requisições. Aguarde um instante." } }));
  // Limita o corpo JSON para ninguém derrubar a API com payload gigante
  app.use(express.json({ limit: "100kb" }));

  // Rota pública para checar se a API está no ar
  app.get("/api/saude", (req, res) => res.json({ status: "ok" }));

  // Cada módulo cuida do seu prefixo de URL
  app.use("/api/auth", authRotas);
  app.use("/api/movimentacoes", movimentacoesRotas);
  app.use("/api/categorias", categoriasRotas);
  app.use("/api/importacao", importacaoRotas);
  app.use("/api/exportacao", exportacaoRotas);

  // Sempre por último: 404 para rotas desconhecidas e tratador central de erros
  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
