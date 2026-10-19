import { useState } from "react";
import { moeda, dataCurta } from "./format.js";

const W = 800, H = 260, PAD = { t: 16, r: 8, b: 28, l: 8 };

// saldo acumulado ao longo do tempo, em degraus: o saldo so muda quando ha movimentacao
export default function Grafico({ movimentos }) {
  const [hover, setHover] = useState(null);
  if (!movimentos.length) return null;

  let acc = 0;
  const pontos = movimentos.map((m) => ({ ...m, saldo: (acc += m.valor) }));
  const t = (iso) => new Date(iso).getTime();
  const t0 = t(pontos[0].data), t1 = t(pontos.at(-1).data);
  const min = Math.min(0, ...pontos.map((p) => p.saldo));
  const max = Math.max(...pontos.map((p) => p.saldo));
  const x = (p) => PAD.l + ((t(p.data) - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);

  let d = `M${x(pontos[0])},${y(0)}`;
  pontos.forEach((p, i) => {
    d += ` H${x(p)} V${y(p.saldo)}`;
  });
  const area = `${d} V${y(0)} Z`;

  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let melhor = 0;
    pontos.forEach((p, i) => {
      if (Math.abs(x(p) - px) < Math.abs(x(pontos[melhor]) - px)) melhor = i;
    });
    setHover(melhor);
  };
  const h = hover != null ? pontos[hover] : null;

  return (
    <figure className="grafico">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Saldo acumulado de ${dataCurta(pontos[0].data)} a ${dataCurta(pontos.at(-1).data)}, terminando em ${moeda(acc)}`}
        onMouseMove={mover}
        onMouseLeave={() => setHover(null)}
      >
        <path d={area} className="area" />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="zero" />
        <path d={d} className="linha" pathLength="1" />
        <text x={PAD.l} y={H - 8} className="eixo">{dataCurta(pontos[0].data)}</text>
        <text x={W - PAD.r} y={H - 8} className="eixo" textAnchor="end">{dataCurta(pontos.at(-1).data)}</text>
        {h && (
          <g>
            <line x1={x(h)} x2={x(h)} y1={PAD.t} y2={H - PAD.b} className="guia" />
            <circle cx={x(h)} cy={y(h.saldo)} r="5" className="ponto" />
          </g>
        )}
      </svg>
      <figcaption aria-live="polite">
        {h ? (
          <>
            <strong>{moeda(h.saldo)}</strong> após {h.descricao.toLowerCase()} em {dataCurta(h.data)}
          </>
        ) : (
          "Passe o mouse no gráfico para ver o saldo após cada movimentação."
        )}
      </figcaption>
    </figure>
  );
}
