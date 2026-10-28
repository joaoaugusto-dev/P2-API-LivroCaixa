// ROTAS de /api/movimentacoes: define QUAL URL chama QUAL controlador e QUEM pode (permissão).
// Ordem em cada rota: autorizar (pode?) -> validar (dados ok?) -> assincrono(controlador) (faz).
import { Router } from "express";
import { z } from "zod"; // biblioteca de validação: descreve o formato esperado dos dados
import { assincrono } from "../../compartilhado/asyncHandler.js";
import { autenticar } from "../../compartilhado/middlewares/autenticar.js";
import { autorizar } from "../../compartilhado/middlewares/autorizar.js";
import { validar } from "../../compartilhado/middlewares/validar.js";
import { dataISO, idParam } from "../../compartilhado/schemas.js";
import * as c from "./movimentacoes.controlador.js";

// Mensagem única para dados ruins (é a que a tela mostra no formulário)
const msg = "Informe data, valor e descricao validos";

// Formato de uma movimentação: data real, valor numérico finito e descrição de 1 a 255 caracteres
const movimentacao = z.object({
  data: dataISO,
  // NUMERIC(15,2) do banco comporta até 13 dígitos inteiros
  valor: z.number({ invalid_type_error: msg, required_error: msg }).finite(msg).refine((v) => Math.abs(v) < 1e13, msg),
  descricao: z.string({ required_error: msg }).trim().min(1, msg).max(255, msg),
});

// Um schema por rota: params = parte da URL (/:id), body = corpo JSON
const schemas = {
  criar: { body: movimentacao.extend({ categoria_id: z.number().int().positive().nullish() }) }, // categoria é opcional
  editar: { params: idParam, body: movimentacao },
  categoria: { params: idParam, body: z.object({ categoria_id: z.number({ invalid_type_error: "Categoria invalida" }).int().positive("Categoria invalida").nullable() }) },
};

const router = Router();
router.use(autenticar); // TODAS as rotas abaixo exigem login (401 se não tiver)

router.get("/", autorizar("movimentacoes:ler"), assincrono(c.listar));
router.post("/", autorizar("movimentacoes:criar"), validar(schemas.criar), assincrono(c.criar));
router.put("/:id", autorizar("movimentacoes:editar"), validar(schemas.editar), assincrono(c.atualizar));
router.delete("/:id", autorizar("movimentacoes:apagar"), validar({ params: idParam }), assincrono(c.excluir));
router.put("/:id/categoria", autorizar("movimentacoes:categorizar"), validar(schemas.categoria), assincrono(c.definirCategoria));

export default router;
