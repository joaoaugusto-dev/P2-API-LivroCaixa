// Conexão com o PostgreSQL (pool compartilhado por todos os módulos).
import pg from "pg";
import { env } from "../config/env.js";

// NUMERIC (1700) chega como número e DATE (1082) como texto "AAAA-MM-DD" (sem sofrer com fuso horário)
pg.types.setTypeParser(1700, (v) => parseFloat(v));
pg.types.setTypeParser(1082, (v) => v);

// Pool = conjunto de conexões reaproveitadas (abrir conexão nova a cada requisição seria lento)
export const pool = new pg.Pool({ connectionString: env.bancoUrl, max: 5 });

// Consulta simples: consultar(sql, [parametros]). Sempre $1, $2... (nunca concatene texto: SQL injection).
export const consultar = (sql, params) => pool.query(sql, params);

// Várias queries numa transação: tudo grava ou nada grava. fn recebe o cliente da transação.
export async function transacao(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await fn(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
}
