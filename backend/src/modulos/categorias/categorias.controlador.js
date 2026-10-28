// CONTROLADOR de categorias: recebe a requisição, chama o serviço e responde em JSON.
// (As regras e o SQL ficam em categorias.servico.js; o aprendizado, em classificador.js.)
import * as servico from "./categorias.servico.js";

// GET /api/categorias -> cada categoria com quantas movimentações tem e o total em R$
export const listar = async (req, res) => res.json(await servico.listar());

// POST /api/categorias -> cria; devolve o id novo (201 = criado)
export const criar = async (req, res) => res.status(201).json({ ok: true, id: await servico.criar(req.body) });

// PUT /api/categorias/:id -> renomeia / troca a cor
export const atualizar = async (req, res) => { await servico.atualizar(req.params.id, req.body); res.json({ ok: true }); };

// DELETE /api/categorias/:id -> exclui (as movimentações dela voltam a ser classificadas)
export const excluir = async (req, res) => { await servico.excluir(req.params.id); res.json({ ok: true }); };

// POST /api/categorias/reclassificar -> botão "Reaprender"; "mudaram" = quantas movimentações trocaram de categoria
export const reclassificar = async (req, res) => res.json({ ok: true, mudaram: await servico.reclassificar() });
