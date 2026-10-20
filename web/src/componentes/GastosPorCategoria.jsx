// GRÁFICO "PARA ONDE FOI O DINHEIRO": uma barra empilhada com a divisão por categoria + lista com % e valor.
import { useMemo, useState } from "react";
import Segmentos from "./Segmentos.jsx";
import useVisivel from "../hooks/useVisivel.js";
import { corDe } from "./Categoria.jsx";
import { moeda, percentual } from "../format.js";

const TIPOS = [["saidas", "Saídas"], ["entradas", "Entradas"]];

export default function GastosPorCategoria({ movs, categorias }) {
  const [tipo, setTipo] = useState("saidas");
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

  return (
    <div className="por-categoria" ref={ref}>
      <Segmentos opcoes={TIPOS} valor={tipo} onChange={setTipo} rotulo="Tipo de movimentação" />
      {itens.length === 0 ? (
        <p className="nota">Nenhuma {tipo === "saidas" ? "saída" : "entrada"} neste recorte.</p>
      ) : (
        <>
          {/* barra empilhada: cada fatia tem a cor da categoria (2px de espaço entre elas) */}
          <div className={"pilha" + (visivel ? " cresce" : "")} role="img" aria-label={`Divisão de ${moeda(total)} por categoria`} key={tipo + itens.length}>
            {itens.map((i) => <span key={i.id} style={{ flexGrow: i.valor, "--cat": corDe(i.cor) }} title={`${i.nome}: ${percentual(i.pct)}`} />)}
          </div>
          {/* lista com os nomes escritos (a cor nunca é a única pista) */}
          <ul className="lista-cat">
            {itens.map((i) => (
              <li key={i.id}>
                <span className="cat-ponto" style={{ "--cat": corDe(i.cor) }} aria-hidden="true" />
                <span className="lc-nome">{i.nome}</span>
                <span className="lc-pct">{percentual(i.pct)}</span>
                <span className="lc-valor">{moeda(i.valor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
