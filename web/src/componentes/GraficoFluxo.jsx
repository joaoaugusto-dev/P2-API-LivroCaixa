// GRÁFICO DE ENTRADAS E SAÍDAS por dia (ou por semana). 3 estilos trocáveis por botões:
//   colunas  = entradas acima da linha do zero, saídas abaixo
//   linhas   = as mesmas duas séries ligadas por linhas
//   liquido  = uma coluna só por período: quanto sobrou (verde, acima) ou faltou (vermelho, abaixo)
// As colunas crescem quando o gráfico aparece na tela; passando o mouse, uma dica mostra os valores.
import { useMemo, useState } from "react";
import TipoGrafico, { usePreferencia } from "./TipoGrafico.jsx";
import { porPeriodo } from "../Kpis.js";
import useVisivel from "../hooks/useVisivel.js";
import { moeda, dataCurta, dataCompleta } from "../format.js";

// Tamanho interno do desenho, margens (PAD) e raio do canto das barras (R)
const W = 800, H = 380, PAD = { t: 14, b: 26, l: 4, r: 4 };
const R = 3;
// Os 3 estilos do gráfico: [id, nome]
const MODOS = [["colunas", "Colunas"], ["linhas", "Linhas"], ["liquido", "Saldo do período"]];
// Texto da legenda de cada estilo
const LEGENDA = { colunas: ["Entradas", "Saídas"], linhas: ["Entradas", "Saídas"], liquido: ["Sobrou", "Faltou"] };

// Desenha uma coluna presa à linha do zero, com cantos arredondados só na ponta (para cima = verde, para baixo = vermelho)
function barra(x, base, w, h, cima) {
  const r = Math.min(R, w / 2, h);
  const topo = cima ? base - h : base + h;
  return cima
    ? `M${x},${base}V${topo + r}Q${x},${topo} ${x + r},${topo}H${x + w - r}Q${x + w},${topo} ${x + w},${topo + r}V${base}Z`
    : `M${x},${base}V${topo - r}Q${x},${topo} ${x + r},${topo}H${x + w - r}Q${x + w},${topo} ${x + w},${topo - r}V${base}Z`;
}

// Recebe as movimentações do recorte (já filtradas)
export default function GraficoFluxo({ movs }) {
  const [modo, setModo] = usePreferencia("fluxo", "colunas"); // estilo escolhido (fica salvo)
  const [ref, visivel] = useVisivel();
  const [ativo, setAtivo] = useState(null);
  const { semanal, itens } = useMemo(() => porPeriodo(movs), [movs]);
  if (!itens.length) return null;

  // Para cada período: quanto desenhar para cima (sobe) e para baixo (desce), conforme o estilo
  const barras = itens.map((i) => {
    const liquido = i.entradas + i.saidas;
    return modo === "liquido" ? { sobe: Math.max(liquido, 0), desce: Math.max(-liquido, 0) } : { sobe: i.entradas, desce: -i.saidas };
  });
  // escala vertical: o maior valor para cima e o maior para baixo definem onde fica a linha do zero
  const maxE = Math.max(...barras.map((b) => b.sobe), 0);
  const maxS = Math.max(...barras.map((b) => b.desce), 0);
  const total = maxE + maxS || 1;
  const util = H - PAD.t - PAD.b;
  const base = PAD.t + (maxE / total) * util;
  const escala = util / total;
  // largura de cada coluna e posição horizontal do centro
  const passo = (W - PAD.l - PAD.r) / itens.length;
  const w = Math.min(passo * 0.62, 28);
  // posição horizontal do centro de cada período
  const cx = (i) => PAD.l + passo * (i + 0.5);
  // sel = período sob o mouse; rotulo() monta o título da dica
  const sel = ativo != null ? itens[ativo] : null;
  // título da dica: a data (ou "Semana de ...")
  const rotulo = (i) => (semanal ? "Semana de " : "") + dataCompleta(i.inicio);
  // pontos das duas linhas (estilo "linhas")
  const linha = (f) => barras.map((b, i) => `${i ? "L" : "M"}${cx(i)},${f(b)}`).join(" ");
  const [rotuloCima, rotuloBaixo] = LEGENDA[modo];

  return (
    <figure className="fluxo" ref={ref}>
      {/* topo: legenda (a cor nunca é a única pista: o de cima é sempre o verde) + botões do tipo de gráfico */}
      <div className="grafico-topo">
        <ul className="legenda">
          <li><span className="amostra entrada" />{rotuloCima}</li>
          <li><span className="amostra saida" />{rotuloBaixo}</li>
        </ul>
        <TipoGrafico opcoes={MODOS} valor={modo} onChange={setModo} />
      </div>
      <div className="fluxo-area" onMouseLeave={() => setAtivo(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Entradas e saídas ${semanal ? "por semana" : "por dia"}, de ${dataCurta(itens[0].inicio)} a ${dataCurta(itens.at(-1).inicio)}`}>
          {/* linha do zero */}
          <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} className="zero-fluxo" />
          {/* a key refaz a animação quando o estilo muda */}
          <g key={modo}>
            {/* estilo "linhas": duas linhas que se desenham, com pontos */}
            {modo === "linhas" && (
              <>
                <path className={"l-entrada" + (visivel ? " desenha" : "")} d={linha((b) => base - b.sobe * escala)} pathLength="1" />
                <path className={"l-saida" + (visivel ? " desenha" : "")} d={linha((b) => base + b.desce * escala)} pathLength="1" />
                {barras.map((b, i) => (
                  <g key={i} className={"pontos-fluxo" + (visivel ? " aparece" : "")} style={{ "--i": i }}>
                    {b.sobe > 0 && <circle cx={cx(i)} cy={base - b.sobe * escala} r="3.5" className="p-entrada" />}
                    {b.desce > 0 && <circle cx={cx(i)} cy={base + b.desce * escala} r="3.5" className="p-saida" />}
                  </g>
                ))}
              </>
            )}
            {/* estilos "colunas" e "liquido": uma coluna para cima e uma para baixo por período */}
            {modo !== "linhas" && barras.map((b, i) => (
              <g key={itens[i].inicio} className={"coluna" + (visivel ? " cresce" : "") + (ativo != null && ativo !== i ? " apagada" : "")} style={{ "--i": i }}>
                {b.sobe > 0 && <path className="b-entrada" d={barra(cx(i) - w / 2, base - 1, w, Math.max(b.sobe * escala - 1, 2), true)} />}
                {b.desce > 0 && <path className="b-saida" d={barra(cx(i) - w / 2, base + 1, w, Math.max(b.desce * escala - 1, 2), false)} />}
              </g>
            ))}
          </g>
          {/* áreas sensíveis ao mouse (retângulos transparentes, mais fáceis de acertar que a barra) */}
          {itens.map((it, i) => (
            <rect key={it.inicio} x={PAD.l + passo * i} y="0" width={passo} height={H} className="alvo" onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} />
          ))}
          <text x={PAD.l} y={H - 8} className="eixo">{dataCurta(itens[0].inicio)}</text>
          <text x={W - PAD.r} y={H - 8} className="eixo" textAnchor="end">{dataCurta(itens.at(-1).inicio)}</text>
        </svg>
        {/* dica que acompanha o mouse: entradas, saídas e saldo do período */}
        <div className={"dica-fluxo" + (sel ? " ativa" : "")} style={{ left: `${sel ? Math.min(Math.max((cx(ativo) / W) * 100, 16), 84) : 50}%` }} aria-hidden={!sel}>
          {sel && (
            <>
              <strong>{rotulo(sel)}</strong>
              <span><i className="amostra entrada" />Entradas <b>{moeda(sel.entradas)}</b></span>
              <span><i className="amostra saida" />Saídas <b>{moeda(sel.saidas)}</b></span>
              <span className="saldo-dia">Saldo <b>{moeda(sel.entradas + sel.saidas)}</b></span>
            </>
          )}
        </div>
      </div>
      <figcaption>{semanal ? "Cada ponto é uma semana." : "Cada ponto é um dia."} Passe o mouse para ver os valores.</figcaption>
    </figure>
  );
}
