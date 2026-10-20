// GRÁFICO DO SALDO (painel principal): saldo acumulado ao longo do tempo, com 3 estilos trocáveis por botões:
// degraus (o saldo só muda quando há movimentação), linha (com pontos) e área (linha + preenchimento).
import { useState } from "react";
import TipoGrafico, { usePreferencia } from "./componentes/TipoGrafico.jsx";
import { moeda, dataCurta } from "./format.js";

// Tamanho interno do desenho (o SVG escala sozinho) e margens
const W = 800, H = 260, PAD = { t: 16, r: 8, b: 28, l: 8 };
// Os 3 estilos do gráfico: [id, nome]
const MODOS = [["degraus", "Degraus"], ["linha", "Linha"], ["area", "Área"]];

// Passando o mouse, uma guia mostra o saldo após cada movimentação.
export default function Grafico({ movimentos }) {
  const [modo, setModo] = usePreferencia("saldo", "degraus"); // estilo escolhido (fica salvo)
  const [idx, setIdx] = useState(null); // ultimo ponto tocado (a guia fica onde parou ao sair)
  const [visivel, setVisivel] = useState(false);
  const [pular, setPular] = useState(false); // 1a aparicao: sem deslizar desde a borda
  if (!movimentos.length) return null;

  // saldo acumulado: soma as movimentações em ordem
  let acc = 0;
  const pontos = movimentos.map((m) => ({ ...m, saldo: (acc += m.valor) }));
  // data (texto) -> número, para calcular posições
  const t = (iso) => new Date(iso).getTime();
  // com uma data so, abre um dia para cada lado para o degrau nao virar uma linha vertical
  const dia = 86400000;
  const unica = pontos[0].data === pontos.at(-1).data;
  const t0 = t(pontos[0].data) - (unica ? dia : 0), t1 = t(pontos.at(-1).data) + (unica ? dia : 0);
  // escalas: convertem data -> posição x e valor -> posição y
  const min = Math.min(0, ...pontos.map((p) => p.saldo));
  const max = Math.max(...pontos.map((p) => p.saldo));
  // posição horizontal de um ponto (proporcional à data)
  const x = (p) => PAD.l + ((t(p.data) - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
  // posição vertical de um saldo (proporcional ao valor)
  const y = (v) => PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);

  // monta o traço conforme o estilo escolhido
  let d;
  if (modo === "degraus") {
    // para cada movimentação anda na horizontal (tempo) e sobe/desce na vertical (saldo); mantém o saldo até o fim
    d = `M${x(pontos[0])},${y(0)}`;
    pontos.forEach((p) => { d += ` H${x(p)} V${y(p.saldo)}`; });
    d += ` H${W - PAD.r}`;
  } else {
    // linha e área: liga um ponto ao outro em linha reta
    d = pontos.map((p, i) => `${i ? "L" : "M"}${x(p)},${y(p.saldo)}`).join(" ");
  }
  // preenchimento (degraus e área): fecha o traço até a linha do zero
  const area = modo === "linha" ? null : `${d} V${y(0)} ${modo === "area" ? `H${x(pontos[0])} ` : ""}Z`;

  // acha a movimentação mais próxima do mouse
  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let melhor = 0;
    pontos.forEach((p, i) => {
      if (Math.abs(x(p) - px) < Math.abs(x(pontos[melhor]) - px)) melhor = i;
    });
    if (!visivel) {
      setPular(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setPular(false)));
    }
    setIdx(melhor);
    setVisivel(true);
  };
  const h = idx != null ? pontos[idx] : null;

  return (
    <figure className="grafico">
      {/* botões para trocar o estilo do gráfico */}
      <div className="grafico-topo"><TipoGrafico opcoes={MODOS} valor={modo} onChange={setModo} escuro /></div>
      {/* área do gráfico: preenchimento, linha zero, traço do saldo e datas do eixo */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Saldo acumulado de ${dataCurta(pontos[0].data)} a ${dataCurta(pontos.at(-1).data)}, terminando em ${moeda(acc)}`}
        onMouseMove={mover}
        onMouseLeave={() => setVisivel(false)}
      >
        {/* a key faz o traço se desenhar de novo cada vez que o estilo muda */}
        <g key={modo}>
          {area && <path d={area} className="area" />}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="zero" />
          <path d={d} className="linha" pathLength="1" />
          {modo === "linha" && pontos.map((p) => <circle key={p.id} cx={x(p)} cy={y(p.saldo)} r="3.5" className="marca-saldo" />)}
        </g>
        <text x={PAD.l} y={H - 8} className="eixo">{dataCurta(pontos[0].data)}</text>
        <text x={W - PAD.r} y={H - 8} className="eixo" textAnchor="end">{dataCurta(pontos.at(-1).data)}</text>
        {/* guia vertical + bolinha que deslizam até o ponto sob o mouse */}
        <g
          className={"guia-grupo" + (visivel ? " ativo" : "")}
          style={{ transform: `translateX(${h ? x(h) : 0}px)`, transition: pular ? "opacity 150ms" : undefined }}
        >
          <line x1="0" x2="0" y1={PAD.t} y2={H - PAD.b} className="guia" />
          <circle cx="0" cy="0" r="5" className="ponto" style={{ transform: `translateY(${h ? y(h.saldo) : 0}px)`, transition: pular ? "none" : undefined }} />
        </g>
      </svg>
      {/* legenda: mostra o saldo do ponto escolhido (ou a dica de uso) */}
      <figcaption aria-live="polite">
        {visivel && h ? (
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
