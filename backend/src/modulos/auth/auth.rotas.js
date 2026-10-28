// Rotas de autenticação: /api/auth/login, refresh, logout, eu e trocar-senha.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { assincrono } from "../../compartilhado/asyncHandler.js";
import { autenticar } from "../../compartilhado/middlewares/autenticar.js";
import { validar } from "../../compartilhado/middlewares/validar.js";
import { senhaForte } from "../../compartilhado/schemas.js";
import * as c from "./auth.controlador.js";

// Formato esperado do corpo de cada rota (zod). Limites de tamanho evitam abusos.
const schemas = {
  login: { body: z.object({ email: z.string().email("E-mail inválido."), senha: z.string().min(1, "Informe a senha.").max(200) }) },
  refresh: { body: z.object({ refreshToken: z.string().min(1, "Informe o refreshToken.").max(200) }) },
  trocarSenha: { body: z.object({ senhaAtual: z.string().min(1).max(200), senhaNova: senhaForte }) },
};

// Freia força bruta: 20 tentativas de login por IP a cada 15 minutos
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { erro: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

const router = Router();
// Obs.: login/refresh/logout são públicos (ainda não há token); as duas últimas exigem o middleware autenticar.

// públicas (não exigem token)
router.post("/login", limitarLogin, validar(schemas.login), assincrono(c.login));
router.post("/refresh", validar(schemas.refresh), assincrono(c.refresh));
router.post("/logout", validar(schemas.refresh), assincrono(c.logout));

// exigem estar logado (qualquer perfil)
router.get("/eu", autenticar, c.eu);
router.post("/trocar-senha", autenticar, validar(schemas.trocarSenha), assincrono(c.trocarSenha));

export default router;
