// REGRA da importação: grava as transações do OFX sem duplicar e já sugere categoria para as novas.
import { transacao } from "../../compartilhado/db.js";
import { classificarTudo } from "../categorias/categorias.servico.js";

// Tudo numa transação: ou grava tudo ou nada (se der erro no meio, o banco volta ao que era).
export const importar = (movimentos) =>
  transacao(async (db) => {
    // Um único INSERT para o arquivo inteiro (rápido mesmo com banco remoto).
    // unnest() transforma 4 listas (datas, valores, descrições, fitids) em linhas.
    // ON CONFLICT (fitid) DO NOTHING: se o FITID já existe, a linha é pulada em vez de dar erro
    // -> é isso que impede duplicar quando o mesmo extrato é importado duas vezes.
    const { rowCount } = await db.query(
      `INSERT INTO movimentacoes (data_movimentacao, valor, descricao, fitid)
       SELECT * FROM unnest($1::date[], $2::numeric[], $3::text[], $4::text[]) ON CONFLICT (fitid) DO NOTHING`,
      // monta as 4 listas a partir de [{data, valor, descricao, fitid}, ...]
      ["data", "valor", "descricao", "fitid"].map((k) => movimentos.map((m) => m[k]))
    );
    // As movimentações novas já nascem com categoria sugerida pelo classificador
    await classificarTudo(db);
    // rowCount = quantas foram realmente gravadas; o resto já existia
    return { inseridas: rowCount, ignoradas: movimentos.length - rowCount };
  });
