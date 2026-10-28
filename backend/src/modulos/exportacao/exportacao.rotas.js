// ROTA GET /api/exportacao  (só perfis com "relatorios:exportar": ADMIN e EXPORTACAO)
import { Router } from "express";
import { z } from "zod";
import { assincrono } from "../../compartilhado/asyncHandler.js";
import { autenticar } from "../../compartilhado/middlewares/autenticar.js";
import { autorizar } from "../../compartilhado/middlewares/autorizar.js";
import { validar } from "../../compartilhado/middlewares/validar.js";
import { dataISO } from "../../compartilhado/schemas.js";
import * as c from "./exportacao.controlador.js";

// Parâmetros aceitos na URL (?formato=xlsx&tipo=saidas&de=2026-10-01&ate=2026-10-31).
// Qualquer valor fora da lista dá 400 com a mensagem indicada. Os que faltam recebem o valor padrão.
const query = z.object({
  formato: z.enum(["ofx", "xlsx"], { errorMap: () => ({ message: "Formato invalido" }) }).default("ofx"),
  tipo: z.enum(["todas", "entradas", "saidas"], { errorMap: () => ({ message: "Tipo invalido" }) }).default("todas"),
  de: dataISO.optional(),  // início do período (opcional)
  ate: dataISO.optional(), // fim do período (opcional)
});

const router = Router();
router.get("/", autenticar, autorizar("relatorios:exportar"), validar({ query }), assincrono(c.exportar));

export default router;
