// CONTROLADOR de movimentações (camada do meio: HTTP <-> regra de negócio).
// Ele só: 1) pega os dados já validados da requisição (req.params / req.body),
//         2) chama o serviço, 3) devolve o JSON com o código HTTP certo.
// Nenhuma regra nem SQL aqui; isso fica em movimentacoes.servico.js.
// Não precisa de try/catch: se o serviço lançar erro, o "assincrono" das rotas manda para o tratarErros.
import * as servico from "./movimentacoes.servico.js";

// GET /api/movimentacoes -> lista todas
export const listar = async (req, res) => res.json(await servico.listar());

// POST /api/movimentacoes -> cria uma. 201 = "Created"
export const criar = async (req, res) => { await servico.criar(req.body); res.status(201).json({ ok: true }); };

// PUT /api/movimentacoes/:id -> edita data, valor e descrição
export const atualizar = async (req, res) => { await servico.atualizar(req.params.id, req.body); res.json({ ok: true }); };

// DELETE /api/movimentacoes/:id -> exclui
export const excluir = async (req, res) => { await servico.excluir(req.params.id); res.json({ ok: true }); };

// PUT /api/movimentacoes/:id/categoria -> a pessoa escolhe/confirma a categoria.
// "atualizadas" = quantas sugestões automáticas mudaram porque o sistema aprendeu com essa escolha.
export const definirCategoria = async (req, res) =>
  res.json({ ok: true, atualizadas: await servico.definirCategoria(req.params.id, req.body.categoria_id) });
