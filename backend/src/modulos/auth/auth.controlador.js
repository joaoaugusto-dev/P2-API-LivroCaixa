// CONTROLADOR de autenticação: traduz a requisição HTTP em chamadas ao serviço (auth.servico.js).
import * as servico from "./auth.servico.js";

// POST /auth/login -> confere e-mail/senha e devolve { accessToken, refreshToken, usuario }
export const login = async (req, res) => res.json(await servico.login(req.body.email, req.body.senha));

// POST /auth/refresh -> troca o refreshToken por um par novo de tokens
export const refresh = async (req, res) => res.json(await servico.renovar(req.body.refreshToken));

// POST /auth/logout -> invalida o refreshToken. 204 = deu certo e não há corpo na resposta
export const logout = async (req, res) => { await servico.logout(req.body.refreshToken); res.status(204).end(); };

// GET /auth/eu -> dados de quem está logado (req.usuario foi preenchido pelo middleware autenticar)
export const eu = (req, res) => res.json(servico.dadosPublicos(req.usuario));

// POST /auth/trocar-senha -> exige a senha atual; depois derruba as outras sessões
export const trocarSenha = async (req, res) => {
  await servico.trocarSenha(req.usuario.id, req.body.senhaAtual, req.body.senhaNova);
  res.json({ ok: true });
};
