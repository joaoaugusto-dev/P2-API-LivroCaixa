// AUTENTICAÇÃO: descobre QUEM está chamando. Lê "Authorization: Bearer <token>", valida o JWT e
// carrega o usuário do banco. Falhou = 401. Quem decide se pode ou não é o autorizar.js (403).
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { consultar } from "../db.js";
import { ErroHttp } from "../erros.js";
import { assincrono } from "../asyncHandler.js";

export const autenticar = assincrono(async (req, res, next) => {
  const [tipo, token] = (req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !token) throw new ErroHttp(401, "Faça login para continuar.");

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.segredo, { algorithms: ["HS256"] });
  } catch (e) {
    throw new ErroHttp(401, e.name === "TokenExpiredError" ? "Sessão expirada. Renove o token." : "Token inválido.");
  }

  // Confere no banco a cada chamada: usuário desativado ou com perfil novo vale na hora
  const { rows } = await consultar("SELECT id, nome, email, perfil, ativo FROM usuarios WHERE id = $1", [payload.sub]);
  if (!rows[0]?.ativo) throw new ErroHttp(401, "Usuário inativo ou inexistente.");

  req.usuario = rows[0];
  next();
});
