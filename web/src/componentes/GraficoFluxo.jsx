import { useMemo, useState } from "react";
import { porPeriodo } from "../Kpis.js";
import useVisivel from "../hooks/useVisivel.js";
import { moeda, dataCurta, dataCompleta } from "../format.js";

const W = 800, H = 380, PAD = { t: 14, b: 26, l: 4, r: 4 };
const R = 3;

// barra ancorada na linha de base, com cantos arredondados so na ponta dos dados
function barra(x, base, w, h, cima) {
  const r = Math.min(R, w / 2, h);
  const topo = cima ? base - h : base + h;
  return cima
    ? `M${x},${base}V${topo + r}Q${x},${topo} ${x + r},${topo}H${x + w - r}Q${x + w},${topo} ${x + w},${topo + r}V${base}Z`
    : `M${x},${base}V${topo - r}Q${x},${topo} ${x + r},${topo}H${x + w - r}Q${x + w},${topo} ${x + w},${topo - r}V${base}Z`;
}

// entradas acima da linha, saidas abaixo: o saldo do dia e a diferenca entre as duas
export default function GraficoFluxo({ movs }) {
  const [ref, visivel] = useVisivel();
  const [ativo, setAtivo] = useState(null);
  const { semanal, itens } = useMemo(() => porPeriodo(movs), [movs]);
  if (!itens.length) return null;

  const maxE = Math.max(...itens.map((i) => i.entradas), 0);
  const maxS = Math.max(...itens.map((i) => -i.saidas), 0);
  const total = maxE + maxS || 1;
  const util = H - PAD.t - PAD.b;
  const base = PAD.t + (maxE / total) * util;
  const escala = util / total;
  const passo = (W - PAD.l - PAD.r) / itens.length;
  const w = Math.min(passo * 0.62, 28);
  const cx = (i) => PAD.l + passo * (i + 0.5);
  const sel = ativo != null ? itens[ativo] : null;
  const rotulo = (i) => (semanal ? "Semana de " : "") + dataCompleta(i.inicio);

  return (
    <figure className="fluxo" ref={ref}>
      <ul className="legenda">
        <li><span className="amostra entrada" />Entradas</li>
        <li><span className="amostra saida" />Saídas</li>
      </ul>
      <div className="fluxo-area" onMouseLeave={() => setAtivo(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Entradas e saídas ${semanal ? "por semana" : "por dia"}, de ${dataCurta(itens[0].inicio)} a ${dataCurta(itens.at(-1).inicio)}`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={base} y2={base} className="zero-fluxo" />
          {itens.map((it, i) => (
            <g key={it.inicio} className={"coluna" + (visivel ? " cresce" : "") + (ativo != null && ativo !== i ? " apagada" : "")} style={{ "--i": i }}>
              {it.entradas > 0 && <path className="b-entrada" d={barra(cx(i) - w / 2, base - 1, w, Math.max(it.entradas * escala - 1, 2), true)} />}
              {it.saidas < 0 && <path className="b-saida" d={barra(cx(i) - w / 2, base + 1, w, Math.max(-it.saidas * escala - 1, 2), false)} />}
              <rect x={PAD.l + passo * i} y="0" width={passo} height={H} className="alvo" onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} />
            </g>
          ))}
          <text x={PAD.l} y={H - 8} className="eixo">{dataCurta(itens[0].inicio)}</text>
          <text x={W - PAD.r} y={H - 8} className="eixo" textAnchor="end">{dataCurta(itens.at(-1).inicio)}</text>
        </svg>
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
      <figcaption>{semanal ? "Cada coluna é uma semana." : "Cada coluna é um dia."} Passe o mouse para ver os valores.</figcaption>
    </figure>
  );
}
