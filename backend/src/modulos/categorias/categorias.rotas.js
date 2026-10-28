// ROTAS de /api/categorias. Ler é liberado a todos os perfis; criar/editar/excluir/reaprender
// só para quem tem "categorias:gerenciar" (ADMIN e INSERCAO). Veja config/permissoes.js.
import { Router } from "express";
import { z } from "zod";
import { assincrono } from "../../compartilhado/asyncHandler.js";
import { autenticar } from "../../compartilhado/middlewares/autenticar.js";
import { autorizar } from "../../compartilhado/middlewares/autorizar.js";
import { validar } from "../../compartilhado/middlewares/validar.js";
import { idParam } from "../../compartilhado/schemas.js";
import * as c from "./categorias.controlador.js";

// Formato do corpo de criar/editar: nome de até 40 letras e cor de 1 a 8 (a paleta da tela)
const corpo = {
  body: z.object({
    nome: z.string().trim().min(1, "Informe um nome (até 40 letras).").max(40, "Informe um nome (até 40 letras)."),
    cor: z.number().int().min(1, "Cor inválida.").max(8, "Cor inválida.").default(1),
  }),
};

const router = Router();
router.use(autenticar); // tudo aqui exige login

router.get("/", autorizar("categorias:ler"), assincrono(c.listar));
router.post("/", autorizar("categorias:gerenciar"), validar(corpo), assincrono(c.criar));
// precisa vir ANTES de "/:id", senão o Express leria "reclassificar" como se fosse um id
router.post("/reclassificar", autorizar("categorias:gerenciar"), assincrono(c.reclassificar));
router.put("/:id", autorizar("categorias:gerenciar"), validar({ params: idParam, ...corpo }), assincrono(c.atualizar));
router.delete("/:id", autorizar("categorias:gerenciar"), validar({ params: idParam }), assincrono(c.excluir));

export default router;
