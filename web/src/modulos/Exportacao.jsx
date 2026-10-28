// MÓDULO EXPORTAÇÃO: baixar o extrato em OFX, CSV ou Excel, com período e tipo.
import { useMemo, useState } from "react";
import { baixar } from "../api.js";
import Segmentos from "../componentes/Segmentos.jsx";
import { PERIODOS, faixaDe } from "../periodos.js";
import { moeda, dataCompleta } from "../format.js";

// Opções dos seletores de tipo e de formato
const TIPOS = [["todas", "Todas"], ["entradas", "Só entradas"], ["saidas", "Só saídas"]];
// Formatos disponíveis: [id, nome]
const FORMATOS = [["ofx", "OFX"], ["csv", "CSV"], ["xlsx", "Excel"]];

// Frase que explica cada formato de arquivo
const DICAS = {
  ofx: "Formato dos bancos. Se importado de novo, tudo é reconhecido como já existente.",
  csv: "Texto simples para abrir no Excel ou Google Planilhas, sem formatação.",
  xlsx: "Planilha do Excel já formatada com as cores do Livro-caixa, com totais que se recalculam se você editar.",
};

// Gera o CSV aqui no navegador (sem servidor): separador ; e vírgula decimal para abrir direto no Excel
function baixarCsv(linhas, nome, categorias) {
  // escapa aspas para o texto caber numa célula do CSV
  const celula = (t) => `"${String(t).replace(/"/g, '""')}"`;
  // nome da categoria (ou "Sem categoria")
  const nomeDe = (id) => categorias.find((c) => c.id === id)?.nome ?? "Sem categoria";
  // monta o CSV: cabeçalho + uma linha por movimentação
  const corpo = ["Data;Descrição;Valor;Categoria", ...linhas.map((m) => [dataCompleta(m.data), celula(m.descricao), m.valor.toFixed(2).replace(".", ","), celula(nomeDe(m.categoria_id))].join(";"))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + corpo], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nome + ".csv" });
  a.click();
  URL.revokeObjectURL(url);
}

// MÓDULO EXPORTAÇÃO: escolhe período, tipo e formato e baixa o arquivo.
// OFX e Excel são gerados pela API; o CSV é gerado aqui. A caixa ao lado mostra o que será baixado.
export default function Exportacao({ extrato }) {
  const { movs, categorias } = extrato;
  const [periodo, setPeriodo] = useState("tudo");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [tipo, setTipo] = useState("todas");
  const [formato, setFormato] = useState("ofx");

  // período escolhido -> datas de/até (e aviso se estiverem invertidas)
  const faixa = faixaDe(periodo, de, ate);
  const invalido = faixa.de && faixa.ate && faixa.de > faixa.ate;

  // as movimentações que entram no arquivo (mesmo filtro que o servidor aplica)
  const linhas = useMemo(
    () => movs.filter((m) =>
      (!faixa.de || m.data >= faixa.de) && (!faixa.ate || m.data <= faixa.ate) &&
      (tipo === "todas" || (m.valor > 0) === (tipo === "entradas"))
    ),
    [movs, faixa.de, faixa.ate, tipo]
  );
  // soma os valores das movimentações que passam no filtro f
  const soma = (f) => linhas.filter(f).reduce((s, m) => s + m.valor, 0);
  const pronto = linhas.length > 0 && !invalido;

  // filtros enviados à API (a API exige o login, por isso o download passa por baixar() e não por um link)
  const params = { ...(faixa.de && { de: faixa.de }), ...(faixa.ate && { ate: faixa.ate }), ...(tipo !== "todas" && { tipo }) };
  const [falha, setFalha] = useState("");
  const baixarArquivo = () => { setFalha(""); baixar(params, formato).catch((e) => setFalha(e.message)); };
  // nome do arquivo (inclui período e tipo)
  const nomeCsv = ["extrato", faixa.de, faixa.ate, tipo !== "todas" && tipo].filter(Boolean).join("-");

  return (
    <div className="exportar-grade">
      {/* OPÇÕES: período, o que incluir e formato */}
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

      {/* RESUMO do que será baixado + botão de download (CSV é gerado aqui; OFX/Excel vêm da API) */}
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
          <button className="botao" disabled={!pronto} onClick={() => baixarCsv(linhas, nomeCsv, categorias)}>Baixar .csv</button>
        ) : (
          <button className="botao" disabled={!pronto} onClick={baixarArquivo}>Baixar .{formato}</button>
        )}
        {falha && <p className="erro" role="alert">{falha}</p>}
      </aside>
    </div>
  );
}
