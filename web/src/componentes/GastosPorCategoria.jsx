// GRÁFICO "PARA ONDE FOI O DINHEIRO": divisão por categoria. 3 estilos trocáveis por botões:
//   pilha  = uma barra horizontal empilhada + lista com % e valor
//   rosca  = gráfico de rosca (pizza com furo) + a mesma lista
//   barras = uma barra por categoria
import { useMemo, useState } from "react";
import Segmentos from "./Segmentos.jsx";
import TipoGrafico, { usePreferencia } from "./TipoGrafico.jsx";
import useVisivel from "../hooks/useVisivel.js";
import { corDe } from "./Categoria.jsx";
import { moeda, percentual } from "../format.js";

// Alterna entre saídas e entradas
const TIPOS = [["saidas", "Saídas"], ["entradas", "Entradas"]];
// Os 3 estilos do gráfico: [id, nome]
const MODOS = [["pilha", "Barra empilhada"], ["rosca", "Rosca"], ["barras", "Barras"]];

// Recebe as movimentações do recorte e a lista de categorias
export default function GastosPorCategoria({ movs, categorias }) {
  const [tipo, setTipo] = useState("saidas");
  const [modo, setModo] = usePreferencia("categorias", "pilha"); // estilo escolhido (fica salvo)
  const [ref, visivel] = useVisivel();

  // soma o valor de cada categoria (0 = sem categoria) e calcula a fatia de cada uma
  const { total, itens } = useMemo(() => {
    const por = new Map();
    for (const m of movs) {
      if (tipo === "saidas" ? m.valor >= 0 : m.valor <= 0) continue;
      const k = m.categoria_id ?? 0;
      por.set(k, (por.get(k) || 0) + Math.abs(m.valor));
    }
    const total = [...por.values()].reduce((a, b) => a + b, 0);
    const itens = [...por]
      .map(([k, valor]) => {
        const c = categorias.find((x) => x.id === k);
        return { id: k, nome: c ? c.nome : "Sem categoria", cor: c?.cor ?? 0, valor, pct: valor / total };
      })
      .sort((a, b) => b.valor - a.valor);
    return { total, itens };
  }, [movs, categorias, tipo]);

  // Rosca: cada fatia é um arco do mesmo círculo (pathLength=100, então o comprimento do arco é a própria %)
  let acumulado = 0;
  const fatias = itens.map((i) => {
    const fatia = { ...i, comeco: acumulado, tamanho: Math.max(i.pct * 100 - 0.8, 0.4) }; // 0,8 = espaço entre fatias
    acumulado += i.pct * 100;
    return fatia;
  });

  return (
    <div className="por-categoria" ref={ref}>
      {/* topo: saídas/entradas à esquerda e o estilo do gráfico à direita */}
      <div className="grafico-topo">
        <Segmentos opcoes={TIPOS} valor={tipo} onChange={setTipo} rotulo="Tipo de movimentação" />
        <TipoGrafico opcoes={MODOS} valor={modo} onChange={setModo} />
      </div>
      {itens.length === 0 ? (
        <p className="nota">Nenhuma {tipo === "saidas" ? "saída" : "entrada"} neste recorte.</p>
      ) : (
        /* a key refaz a animação ao trocar o tipo ou o estilo */
        <div key={tipo + modo + itens.length} className={"cat-visual modo-" + modo}>
          {modo === "pilha" && (
            /* barra empilhada: cada fatia tem a cor da categoria (2px de espaço entre elas) */
            <div className={"pilha" + (visivel ? " cresce" : "")} role="img" aria-label={`Divisão de ${moeda(total)} por categoria`}>
              {itens.map((i) => <span key={i.id} style={{ flexGrow: i.valor, "--cat": corDe(i.cor) }} title={`${i.nome}: ${percentual(i.pct)}`} />)}
            </div>
          )}
          {modo === "rosca" && (
            /* rosca: o total fica no centro; cada arco "se enche" em sequência */
            <svg className="rosca" viewBox="0 0 120 120" role="img" aria-label={`Divisão de ${moeda(total)} por categoria`}>
              <g transform="rotate(-90 60 60)">
                {fatias.map((f, i) => (
                  <circle key={f.id} cx="60" cy="60" r="44" pathLength="100" className={visivel ? "arco cresce" : "arco"}
                    style={{ "--cat": corDe(f.cor), "--i": i, strokeDasharray: `${f.tamanho} ${100 - f.tamanho}`, strokeDashoffset: -f.comeco }}>
                    <title>{`${f.nome}: ${percentual(f.pct)}`}</title>
                  </circle>
                ))}
              </g>
              <text x="60" y="57" textAnchor="middle" className="rosca-rotulo">{tipo === "saidas" ? "Saídas" : "Entradas"}</text>
              <text x="60" y="73" textAnchor="middle" className="rosca-total">{moeda(total)}</text>
            </svg>
          )}
          {/* lista com os nomes escritos (a cor nunca é a única pista). No estilo "barras" cada linha ganha uma barra */}
          <ul className="lista-cat">
            {itens.map((i, n) => (
              <li key={i.id} style={{ "--i": n }}>
                <span className="cat-ponto" style={{ "--cat": corDe(i.cor) }} aria-hidden="true" />
                <span className="lc-nome">{i.nome}</span>
                <span className="lc-pct">{percentual(i.pct)}</span>
                <span className="lc-valor">{moeda(i.valor)}</span>
                {modo === "barras" && (
                  <span className="lc-trilho"><span className={"lc-barra" + (visivel ? " cresce" : "")} style={{ "--cat": corDe(i.cor), "--p": i.pct / itens[0].pct }} /></span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
