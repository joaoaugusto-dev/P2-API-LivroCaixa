// TESTES AUTOMÁTICOS que não precisam de banco.   Rodar:  cd backend && npm test
// Cobrem as três partes com mais lógica própria: leitura do OFX, classificador e permissões.
process.env.NODE_ENV = "test";
import test from "node:test";
import assert from "node:assert/strict";
import { lerOfx } from "../src/modulos/importacao/ofx.parser.js";
import * as cl from "../src/modulos/categorias/classificador.js";
import { temPermissao } from "../src/config/permissoes.js";

// 1) Leitor de OFX: aceita valor brasileiro (1.234,50), tags sem fechamento e entidades (&amp;)
test("OFX: lê valor BR, data, FITID e tags sem fechamento", () => {
  const ofx = Buffer.from("<OFX><BANKTRANLIST><STMTTRN><DTPOSTED>20261017120000<TRNAMT>-1.234,50<FITID>A1<MEMO>ALUGUEL &amp; CIA</STMTTRN></BANKTRANLIST></OFX>");
  assert.deepEqual(lerOfx(ofx), [{ fitid: "A1", data: "2026-10-17", valor: -1234.5, descricao: "ALUGUEL & CIA" }]);
  // arquivo que não é OFX deve ser recusado
  assert.throws(() => lerOfx(Buffer.from("texto qualquer")), /OFX invalido/);
});

// 2) Classificador: com exemplo manual (peso 3) ele aprende; palavra desconhecida = não chuta
test("classificador: aprende com exemplo manual e respeita o limiar", () => {
  const sementes = [[1, ["aluguel", "_saida"], 1], [2, ["salario", "_saida"], 1]];
  const m = cl.treinar([...sementes, [2, cl.palavras("Pagamento Fulano", -10), cl.PESO_MANUAL]]);
  assert.equal(cl.prever(m, cl.palavras("aluguel sala", -5))[0], 1);       // reconhece pela semente
  assert.equal(cl.prever(m, cl.palavras("pagamento fulano", -5))[0], 2);   // reconhece pelo que aprendeu
  assert.equal(cl.prever(m, cl.palavras("xyz", -5)), null);                // não conhece: devolve null
});

// 3) Permissões: cada perfil só pode o que está na tabela
test("permissões: análise não exporta, exportação não cria", () => {
  assert.equal(temPermissao("ANALISE", "relatorios:exportar"), false);
  assert.equal(temPermissao("EXPORTACAO", "movimentacoes:criar"), false);
  assert.equal(temPermissao("ADMIN", "movimentacoes:apagar"), true);
});
