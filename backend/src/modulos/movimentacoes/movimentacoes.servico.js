// REGRAS e SQL de MOVIMENTAÇÕES: listar, criar, editar, excluir e escolher categoria.
// $1, $2... nos SQLs são parâmetros: o banco recebe os valores separados do texto do comando,
// então nada que o usuário digitar consegue virar comando (proteção contra SQL injection).
import crypto from "node:crypto";
import { consultar, transacao } from "../../compartilhado/db.js";
import { ErroHttp, naoEncontrado } from "../../compartilhado/erros.js";
import { classificarTudo } from "../categorias/categorias.servico.js";

// Lista da mais antiga para a mais nova. Também é usada pela exportação, com filtros opcionais.
// "($1::date IS NULL OR ...)" = só filtra se o parâmetro foi informado.
// Tipo: entradas = valor > 0; saídas = valor <= 0 (mesma regra da tela).
// Os "AS" renomeiam colunas do banco para os nomes que a interface espera (data, auto, confianca).
export async function listar({ de, ate, tipo } = {}) {
  const { rows } = await consultar(
    `SELECT id, data_movimentacao AS data, valor, descricao, fitid, categoria_id, categoria_auto AS auto, categoria_confianca AS confianca
       FROM movimentacoes
      WHERE ($1::date IS NULL OR data_movimentacao >= $1) AND ($2::date IS NULL OR data_movimentacao <= $2)
        AND ($3 = 'todas' OR ($3 = 'entradas' AND valor > 0) OR ($3 = 'saidas' AND valor <= 0))
      ORDER BY data_movimentacao, id`,
    [de ?? null, ate ?? null, tipo ?? "todas"]
  );
  return rows;
}

// Lançamento manual. Ganha um fitid próprio ("manual-<código aleatório>") porque não veio de um OFX.
// Se a pessoa escolheu categoria, ela vale; senão o classificador sugere uma.
// Roda em transação: se a classificação falhar, a movimentação também não é gravada.
export const criar = ({ data, valor, descricao, categoria_id }) =>
  transacao(async (db) => {
    const { rows } = await db.query(
      `INSERT INTO movimentacoes (data_movimentacao, valor, descricao, fitid, categoria_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [data, valor, descricao, "manual-" + crypto.randomUUID().replaceAll("-", ""), categoria_id ?? null]
    ).catch(categoriaInvalida);
    await classificarTudo(db);
    return rows[0].id;
  });

// Edita data, valor e descrição. rowCount = linhas afetadas; 0 significa que o id não existe (404).
export async function atualizar(id, { data, valor, descricao }) {
  const r = await consultar("UPDATE movimentacoes SET data_movimentacao = $1, valor = $2, descricao = $3 WHERE id = $4", [data, valor, descricao, id]);
  if (!r.rowCount) throw naoEncontrado("Movimentação");
}

// Apaga uma movimentação (404 se não existir).
export async function excluir(id) {
  const r = await consultar("DELETE FROM movimentacoes WHERE id = $1", [id]);
  if (!r.rowCount) throw naoEncontrado("Movimentação");
}

// A PESSOA escolheu (ou confirmou) a categoria. Marca como "não automática" (auto = false), o que a
// transforma em exemplo de treino, e recalcula as sugestões das outras.
// Devolve quantas classificações automáticas mudaram por causa disso.
export const definirCategoria = (id, categoriaId) =>
  transacao(async (db) => {
    const r = await db.query(
      "UPDATE movimentacoes SET categoria_id = $1, categoria_auto = FALSE, categoria_confianca = NULL WHERE id = $2",
      [categoriaId, id]
    ).catch(categoriaInvalida);
    if (!r.rowCount) throw naoEncontrado("Movimentação");
    return classificarTudo(db);
  });

// Código 23503 do PostgreSQL = chave estrangeira inválida, ou seja, a categoria informada não existe
function categoriaInvalida(e) {
  throw e.code === "23503" ? new ErroHttp(400, "Categoria não existe.") : e;
}
