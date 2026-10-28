// Regras de CATEGORIAS: CRUD e o ciclo de aprendizado (treinar com o que a pessoa confirmou e reclassificar).
import { consultar, transacao } from "../../compartilhado/db.js";
import { ErroHttp, naoEncontrado } from "../../compartilhado/erros.js";
import * as classificador from "./classificador.js";

// TREINA o modelo com o que existe agora (é rápido: roda a cada mudança, não fica guardado).
// Fontes: 1) palavras-semente das categorias padrão (peso 1); 2) movimentações que a pessoa categorizou à mão (peso 3).
// Classificações automáticas ficam de fora para o sistema não reforçar os próprios erros.: palavras-semente + movimentações categorizadas à mão
async function treinarModelo(db) {
  const { rows: cats } = await db.query("SELECT id, nome FROM categorias");
  const exemplos = cats.flatMap(({ id, nome }) => classificador.sementes(nome).map((p) => [id, p, classificador.PESO_SEMENTE]));
  const { rows: manuais } = await db.query(
    "SELECT categoria_id, descricao, valor FROM movimentacoes WHERE categoria_id IS NOT NULL AND NOT categoria_auto"
  );
  for (const m of manuais) exemplos.push([m.categoria_id, classificador.palavras(m.descricao, m.valor), classificador.PESO_MANUAL]);
  return classificador.treinar(exemplos);
}

// Reclassifica tudo que NÃO foi escolhido pela pessoa (sem categoria ou automático). Só aplica se a
// confiança passar do limiar. Devolve quantas movimentações mudaram de categoria.
// Recebe o cliente da transação em andamento (db), para entrar na mesma transação de quem chamou.
export async function classificarTudo(db) {
  const modelo = await treinarModelo(db);
  // Só reclassifica o que NÃO foi decidido por uma pessoa: sem categoria ou com sugestão automática
  const { rows } = await db.query(
    "SELECT id, descricao, valor, categoria_id FROM movimentacoes WHERE categoria_id IS NULL OR categoria_auto"
  );
  const ids = [], cats = [], confs = [];
  let mudaram = 0;
  for (const m of rows) {
    // prever devolve [categoria, confiança]; abaixo do limiar (60%) fica sem categoria
    const r = classificador.prever(modelo, classificador.palavras(m.descricao ?? "", m.valor));
    const [cat, conf] = r && r[1] >= classificador.LIMIAR ? r : [null, null];
    if (cat !== m.categoria_id) mudaram++;
    ids.push(m.id); cats.push(cat); confs.push(conf);
  }
  // Uma única query grava tudo (o banco é remoto: ida e volta por linha ficaria lento)
  if (ids.length) {
    await db.query(
      `UPDATE movimentacoes m SET categoria_id = v.cat, categoria_auto = v.cat IS NOT NULL, categoria_confianca = v.conf
         FROM unnest($1::int[], $2::int[], $3::real[]) AS v(id, cat, conf) WHERE m.id = v.id`,
      [ids, cats, confs]
    );
  }
  return mudaram;
}

// Botão "Reaprender": roda a reclassificação numa transação própria
export const reclassificar = () => transacao(classificarTudo);

// Cada categoria com quantas movimentações tem e a soma dos valores (LEFT JOIN: categoria vazia aparece com 0)
export async function listar() {
  const { rows } = await consultar(
    `SELECT c.id, c.nome, c.cor, COUNT(m.id)::int AS qtd, COALESCE(SUM(m.valor), 0) AS total
       FROM categorias c LEFT JOIN movimentacoes m ON m.categoria_id = c.id GROUP BY c.id ORDER BY c.nome`
  );
  return rows;
}

// Nome repetido vira 409 com a mensagem que a tela mostra
const nomeUnico = (e) => { throw e.code === "23505" ? new ErroHttp(409, "Já existe uma categoria com esse nome") : e; };

// Cria a categoria e devolve o id novo
export const criar = async ({ nome, cor }) =>
  (await consultar("INSERT INTO categorias (nome, cor) VALUES ($1, $2) RETURNING id", [nome, cor]).catch(nomeUnico)).rows[0].id;

// Renomeia / troca a cor (404 se o id não existe)
export async function atualizar(id, { nome, cor }) {
  const r = await consultar("UPDATE categorias SET nome = $1, cor = $2 WHERE id = $3", [nome, cor, id]).catch(nomeUnico);
  if (!r.rowCount) throw naoEncontrado("Categoria");
}

// As movimentações dela ficam sem categoria e o classificador tenta de novo
export async function excluir(id) {
  await transacao(async (db) => {
    const r = await db.query("DELETE FROM categorias WHERE id = $1", [id]);
    if (!r.rowCount) throw naoEncontrado("Categoria");
    await classificarTudo(db);
  });
}
