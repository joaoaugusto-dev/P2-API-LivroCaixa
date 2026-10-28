// Regras de AUTENTICAÇÃO: login, renovação de token, logout e troca de senha.
//
// Dois tokens:
//  - accessToken (JWT, 15 min): vai em todas as chamadas no header Authorization.
//  - refreshToken (aleatório, 7 dias): só serve para pedir um accessToken novo. No banco fica só o hash.
//    A cada uso ele é trocado por outro (rotação); se alguém reutilizar um já trocado, derrubamos
//    todas as sessões do usuário (sinal de roubo).
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { permissoesDoPerfil } from "../../config/permissoes.js";
import { consultar } from "../../compartilhado/db.js";
import { ErroHttp } from "../../compartilhado/erros.js";

// Hash falso para quando o e-mail não existe: o tempo de resposta fica igual e não revela quem está cadastrado
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-tempo", 10);

const sha256 = (texto) => crypto.createHash("sha256").update(texto).digest("hex");

// O que pode ir para o navegador: nunca inclui senha_hash
export const dadosPublicos = (u) => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, permissoes: permissoesDoPerfil(u.perfil) });

const gerarAccessToken = (u) =>
  jwt.sign({ perfil: u.perfil }, env.jwt.segredo, { subject: String(u.id), expiresIn: env.jwt.expiraEm, algorithm: "HS256" });

async function gerarRefreshToken(usuarioId) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiraEm = new Date(Date.now() + env.jwt.refreshDias * 24 * 60 * 60 * 1000);
  await consultar("INSERT INTO refresh_tokens (usuario_id, token_hash, expira_em) VALUES ($1, $2, $3)", [usuarioId, sha256(token), expiraEm]);
  return token;
}

async function emitirTokens(usuario) {
  return {
    accessToken: gerarAccessToken(usuario),
    refreshToken: await gerarRefreshToken(usuario.id),
    tipo: "Bearer",
    expiraEm: env.jwt.expiraEm,
    usuario: dadosPublicos(usuario),
  };
}

// O bcrypt.compare roda sempre, exista o usuário ou não
export async function login(email, senha) {
  const { rows } = await consultar("SELECT * FROM usuarios WHERE lower(email) = lower($1)", [email]);
  const usuario = rows[0];
  const confere = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_FALSO);
  // Mesma mensagem para e-mail inexistente e senha errada (não entrega pista)
  if (!usuario || !confere) throw new ErroHttp(401, "E-mail ou senha inválidos.");
  if (!usuario.ativo) throw new ErroHttp(403, "Usuário desativado.");
  return emitirTokens(usuario);
}

// Troca um refresh token válido por um par novo
export async function renovar(refreshToken) {
  const registro = (await consultar("SELECT * FROM refresh_tokens WHERE token_hash = $1", [sha256(refreshToken)])).rows[0];
  if (!registro) throw new ErroHttp(401, "Refresh token inválido.");
  if (registro.revogado_em) {
    await revogarTodos(registro.usuario_id);
    throw new ErroHttp(401, "Refresh token já utilizado. Faça login novamente.");
  }
  if (new Date(registro.expira_em) < new Date()) throw new ErroHttp(401, "Refresh token expirado.");

  const usuario = (await consultar("SELECT * FROM usuarios WHERE id = $1", [registro.usuario_id])).rows[0];
  if (!usuario?.ativo) throw new ErroHttp(401, "Usuário inativo ou inexistente.");

  await consultar("UPDATE refresh_tokens SET revogado_em = now() WHERE id = $1", [registro.id]);
  return emitirTokens(usuario);
}

export const logout = (refreshToken) =>
  consultar("UPDATE refresh_tokens SET revogado_em = now() WHERE token_hash = $1 AND revogado_em IS NULL", [sha256(refreshToken)]);

export const revogarTodos = (usuarioId) =>
  consultar("UPDATE refresh_tokens SET revogado_em = now() WHERE usuario_id = $1 AND revogado_em IS NULL", [usuarioId]);

export async function trocarSenha(usuarioId, senhaAtual, senhaNova) {
  const { rows } = await consultar("SELECT senha_hash FROM usuarios WHERE id = $1", [usuarioId]);
  if (!(await bcrypt.compare(senhaAtual, rows[0].senha_hash))) throw new ErroHttp(400, "A senha atual está incorreta.");
  await consultar("UPDATE usuarios SET senha_hash = $1 WHERE id = $2", [await bcrypt.hash(senhaNova, 10), usuarioId]);
  await revogarTodos(usuarioId); // força login de novo nos outros aparelhos
}
