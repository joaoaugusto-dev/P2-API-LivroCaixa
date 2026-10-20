// RANKING das 5 maiores saídas (ou entradas). 2 estilos trocáveis por botões:
//   barras  = uma barra horizontal por item (o comprimento é proporcional ao maior valor)
//   colunas = colunas verticais lado a lado
import { useMemo, useState } from "react";
import Segmentos from "./Segmentos.jsx";
import TipoGrafico, { usePreferencia } from "./TipoGrafico.jsx";
import { maiores } from "../Kpis.js";
import useVisivel from "../hooks/useVisivel.js";
import { moeda, moedaCurta, dataCompleta } from "../format.js";

// Alterna entre o ranking de saídas e o de entradas, e entre os dois estilos
const TIPOS = [["saidas", "Saídas"], ["entradas", "Entradas"]];
// Os 2 estilos do ranking: [id, nome]
const MODOS = [["barras", "Barras"], ["colunas", "Colunas"]];

// Recebe as movimentações do recorte (já filtradas)
export default function Ranking({ movs }) {
  const [tipo, setTipo] = useState("saidas");
  const [modo, setModo] = usePreferencia("ranking", "barras"); // estilo escolhido (fica salvo)
  const [ref, visivel] = useVisivel();
  // as 5 maiores do tipo escolhido (só recalcula quando algo muda)
  const lista = useMemo(() => maiores(movs, tipo), [movs, tipo]);
  // `topo` = maior valor, usado como 100% da barra
  const topo = Math.abs(lista[0]?.valor ?? 1);
  // vermelho para saída, verde para entrada
  const cor = (m) => (m.valor < 0 ? "saida" : "entrada");

  return (
    <div className="ranking" ref={ref}>
      {/* escolhe saídas/entradas (esquerda) e o estilo do gráfico (direita) */}
      <div className="grafico-topo">
        <Segmentos opcoes={TIPOS} valor={tipo} onChange={setTipo} rotulo="Tipo do ranking" />
        <TipoGrafico opcoes={MODOS} valor={modo} onChange={setModo} />
      </div>
      {modo === "barras" ? (
        /* a key muda ao trocar de tipo/estilo, para as barras se preencherem de novo */
        <ol key={"b" + tipo + lista.map((m) => m.id).join()}>
          {lista.map((m, i) => (
            <li key={m.id} className={visivel ? "cresce" : ""} style={{ "--i": i }}>
              <div className="ranking-texto">
                <span className="ranking-nome" title={m.descricao}>{m.descricao}</span>
                <span className="ranking-valor">{moeda(m.valor)}</span>
              </div>
              <div className="ranking-trilho"><span className={"ranking-barra " + cor(m)} style={{ "--p": Math.abs(m.valor) / topo }} /></div>
              <span className="nota">{dataCompleta(m.data)}</span>
            </li>
          ))}
          {!lista.length && <li className="nota">Nenhuma {tipo === "saidas" ? "saída" : "entrada"} neste recorte.</li>}
        </ol>
      ) : (
        /* colunas verticais: a altura é proporcional ao maior valor */
        <ol className="rk-colunas" key={"c" + tipo + lista.map((m) => m.id).join()}>
          {lista.map((m, i) => (
            <li key={m.id} className={visivel ? "cresce" : ""} style={{ "--i": i }} title={`${m.descricao}, ${dataCompleta(m.data)}`}>
              <span className="rk-valor">{moedaCurta(m.valor).replace(/R\$\s?/, "")}</span> {/* sem "R$" para caber; o valor completo está na dica (title) */}
              <span className="rk-trilho"><span className={"rk-coluna " + cor(m)} style={{ "--p": Math.abs(m.valor) / topo }} /></span>
              <span className="rk-nome">{m.descricao}</span>
            </li>
          ))}
          {!lista.length && <li className="nota">Nenhuma {tipo === "saidas" ? "saída" : "entrada"} neste recorte.</li>}
        </ol>
      )}
    </div>
  );
}
