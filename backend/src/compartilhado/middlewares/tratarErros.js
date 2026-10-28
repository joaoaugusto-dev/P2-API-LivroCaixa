// Último middleware: transforma qualquer erro em JSON { erro, detalhes? }.
import { ErroHttp } from "../erros.js";

// Nenhuma rota respondeu: 404
export const rotaNaoEncontrada = (req, res, next) => next(new ErroHttp(404, "Rota não encontrada."));

// Erros de rede/conexão do pg: o banco está fora do ar ou o .env está errado
const SEM_BANCO = new Set(["ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "57P01", "08006", "28P01"]);

// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ErroHttp) return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido no corpo da requisição." });
  if (err.type === "entity.too.large") return res.status(413).json({ erro: "Corpo da requisição grande demais." });
  if (err.name === "MulterError") {
    const grande = err.code === "LIMIT_FILE_SIZE";
    return res.status(grande ? 413 : 400).json({ erro: grande ? "Arquivo maior que o limite de 5 MB." : "Erro no envio do arquivo." });
  }
  // PostgreSQL: 23505 = valor único repetido, 23503 = chave estrangeira inválida
  if (err.code === "23505") return res.status(409).json({ erro: "Registro duplicado." });
  if (err.code === "23503") return res.status(409).json({ erro: "Referência inválida." });
  if (SEM_BANCO.has(err.code) || /timeout|terminated unexpectedly/i.test(err.message)) {
    console.error("Banco indisponível:", err.message);
    return res.status(503).json({ erro: "Sem acesso ao banco de dados. Confira o DATABASE_URL no arquivo .env." });
  }

  // Qualquer outro erro é bug nosso: loga no servidor, não vaza detalhes para o cliente
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
}
