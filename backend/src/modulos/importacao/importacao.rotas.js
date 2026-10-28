// ROTA POST /api/importacao  (formulário "multipart", campo "arquivo" com o .ofx)
import { Router } from "express";
import multer from "multer"; // biblioteca que recebe uploads de arquivo
import { assincrono } from "../../compartilhado/asyncHandler.js";
import { autenticar } from "../../compartilhado/middlewares/autenticar.js";
import { autorizar } from "../../compartilhado/middlewares/autorizar.js";
import * as c from "./importacao.controlador.js";

// O arquivo fica só na memória (nada é salvo em disco), no máximo 5 MB e um arquivo por vez.
// Passou do limite: o multer gera um erro que o tratarErros transforma em 413.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

const router = Router();
// Ordem importa: 1) está logado? 2) o perfil pode importar? 3) só então lê o arquivo enviado
router.post("/", autenticar, autorizar("importacao:criar"), upload.single("arquivo"), assincrono(c.importar));

export default router;
