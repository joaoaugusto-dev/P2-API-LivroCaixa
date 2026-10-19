import { useMemo, useState } from "react";
import { URL_EXPORTAR } from "../api.js";
import { moeda, dataCompleta } from "../format.js";

const iso = (d) => d.toISOString().slice(0, 10);
const dias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

const PERIODOS = [
  ["tudo", "Tudo", () => ({})],
  ["7", "Últimos 7 dias", () => ({ de: dias(7) })],
  ["30", "Últimos 30 dias", () => ({ de: dias(30) })],
  ["mes", "Este mês", () => ({ de: iso(new Date()).slice(0, 8) + "01" })],
  ["custom", "Personalizado", null],
];
const TIPOS = [["todas", "Todas"], ["entradas", "Só entradas"], ["saidas", "Só saídas"]];
const FORMATOS = [["ofx", "OFX"], ["csv", "CSV"], ["xlsx", "Excel"]];

const DICAS = {
  ofx: "Formato dos bancos. Se importado de novo, tudo é reconhecido como já existente.",
  csv: "Texto simples para abrir no Excel ou Google Planilhas, sem formatação.",
  xlsx: "Planilha do Excel já formatada com as cores do Livro-caixa, com totais que se recalculam se você editar.",
};

// CSV em pt-BR para abrir direto no Excel (separador ; e virgula decimal, com BOM)
function baixarCsv(linhas, nome) {
  const celula = (t) => `"${String(t).replace(/"/g, '""')}"`;
  const corpo = ["Data;Descrição;Valor", ...linhas.map((m) => [dataCompleta(m.data), celula(m.descricao), m.valor.toFixed(2).replace(".", ",")].join(";"))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + corpo], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome + ".csv" });
  a.click();
  URL.revokeObjectURL(url);
}

function Segmentos({ opcoes, valor, onChange, rotulo }) {
  return (
    <div className="filtros" role="group" aria-label={rotulo} style={{ "--i": opcoes.findIndex(([v]) => v === valor), "--n": opcoes.length }}>
      {opcoes.map(([v, nome]) => <button type="button" key={v} aria-pressed={v === valor} onClick={() => onChange(v)}>{nome}</button>)}
    </div>
  );
}

// baixa o que esta no banco, com periodo, tipo e formato escolhidos
export default function Exportacao({ extrato }) {
  const { movs } = extrato;
  const [periodo, setPeriodo] = useState("tudo");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [tipo, setTipo] = useState("todas");
  const [formato, setFormato] = useState("ofx");

  const faixa = periodo === "custom" ? { de: de || undefined, ate: ate || undefined } : PERIODOS.find(([p]) => p === periodo)[2]();
  const invalido = faixa.de && faixa.ate && faixa.de > faixa.ate;

  const linhas = useMemo(
    () => movs.filter((m) =>
      (!faixa.de || m.data >= faixa.de) && (!faixa.ate || m.data <= faixa.ate) &&
      (tipo === "todas" || (m.valor > 0) === (tipo === "entradas"))
    ),
    [movs, faixa.de, faixa.ate, tipo]
  );
  const soma = (f) => linhas.filter(f).reduce((s, m) => s + m.valor, 0);
  const pronto = linhas.length > 0 && !invalido;

  const params = new URLSearchParams({ ...(formato === "xlsx" && { formato }), ...(faixa.de && { de: faixa.de }), ...(faixa.ate && { ate: faixa.ate }), ...(tipo !== "todas" && { tipo }) });
  const href = URL_EXPORTAR + (params.size ? "?" + params : "");
  const nomeCsv = ["extrato", faixa.de, faixa.ate, tipo !== "todas" && tipo].filter(Boolean).join("-");

  return (
    <div className="exportar-grade">
      <section className="painel">
        <h2>Exportar extrato</h2>

        <p className="rotulo">Período</p>
        <div className="chips" role="group" aria-label="Período">
          {PERIODOS.map(([p, nome]) => <button type="button" key={p} aria-pressed={periodo === p} onClick={() => setPeriodo(p)}>{nome}</button>)}
        </div>
        {periodo === "custom" && (
          <div className="datas">
            <label>De<input type="date" value={de} max={ate || undefined} onChange={(e) => setDe(e.target.value)} /></label>
            <label>Até<input type="date" value={ate} min={de || undefined} onChange={(e) => setAte(e.target.value)} /></label>
          </div>
        )}
        {invalido && <p className="erro">A data inicial é depois da final.</p>}

        <p className="rotulo">O que incluir</p>
        <Segmentos opcoes={TIPOS} valor={tipo} onChange={setTipo} rotulo="Tipo de movimentação" />

        <p className="rotulo">Formato</p>
        <Segmentos opcoes={FORMATOS} valor={formato} onChange={setFormato} rotulo="Formato do arquivo" />
        <p className="nota">{DICAS[formato]}</p>
      </section>

      <aside className="painel resultado" aria-live="polite">
        <h2>O que será baixado</h2>
        <dl className="resumo-export">
          <div><dt>Movimentações</dt><dd>{linhas.length}</dd></div>
          <div><dt>Período</dt><dd>{linhas.length ? `${dataCompleta(linhas[0].data)} a ${dataCompleta(linhas.at(-1).data)}` : "—"}</dd></div>
          <div><dt>Entradas</dt><dd className="entrada">{moeda(soma((m) => m.valor > 0))}</dd></div>
          <div><dt>Saídas</dt><dd className="saida">{moeda(soma((m) => m.valor < 0))}</dd></div>
          <div><dt>Saldo</dt><dd>{moeda(soma(() => true))}</dd></div>
        </dl>
        {!linhas.length && !invalido && <p className="nota">Nenhuma movimentação nesse filtro. Mude o período ou o tipo.</p>}
        {formato === "csv" ? (
          <button className="botao" disabled={!pronto} onClick={() => baixarCsv(linhas, nomeCsv)}>Baixar .csv</button>
        ) : (
          <a className="botao" href={pronto ? href : undefined} download aria-disabled={!pronto}>Baixar .{formato}</a>
        )}
      </aside>
    </div>
  );
}
