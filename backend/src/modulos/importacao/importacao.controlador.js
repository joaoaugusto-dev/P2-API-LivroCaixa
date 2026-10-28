// CONTROLADOR da importação: recebe o arquivo, manda ler o OFX e depois gravar.
import { ErroHttp } from "../../compartilhado/erros.js";
import { lerOfx } from "./ofx.parser.js";
import * as servico from "./importacao.servico.js";

// POST /api/importacao
export async function importar(req, res) {
  // req.file é preenchido pelo multer (rotas); se não veio arquivo, é erro do cliente (400)
  if (!req.file) throw new ErroHttp(400, "Nenhum arquivo enviado. Use o campo 'arquivo'.");
  // lerOfx transforma o texto do OFX numa lista de movimentações; o serviço grava e responde { inseridas, ignoradas }
  res.status(201).json(await servico.importar(lerOfx(req.file.buffer)));
}
