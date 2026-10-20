import { useMemo, useState } from "react";
import Segmentos from "./Segmentos.jsx";
import { maiores } from "../Kpis.js";
import useVisivel from "../hooks/useVisivel.js";
import { moeda, dataCompleta } from "../format.js";

const TIPOS = [["saidas", "Saídas"], ["entradas", "Entradas"]];

// as 5 maiores movimentacoes do tipo escolhido; a barra e proporcional ao maior valor
export default function Ranking({ movs }) {
  const [tipo, setTipo] = useState("saidas");
  const [ref, visivel] = useVisivel();
  const lista = useMemo(() => maiores(movs, tipo), [movs, tipo]);
  const topo = Math.abs(lista[0]?.valor ?? 1);

  return (
    <div className="ranking" ref={ref}>
      <Segmentos opcoes={TIPOS} valor={tipo} onChange={setTipo} rotulo="Tipo do ranking" />
      <ol key={tipo + lista.map((m) => m.id).join()}>
        {lista.map((m, i) => (
          <li key={m.id} className={visivel ? "cresce" : ""} style={{ "--i": i }}>
            <div className="ranking-texto">
              <span className="ranking-nome" title={m.descricao}>{m.descricao}</span>
              <span className="ranking-valor">{moeda(m.valor)}</span>
            </div>
            <div className="ranking-trilho"><span className={"ranking-barra " + (m.valor < 0 ? "saida" : "entrada")} style={{ "--p": Math.abs(m.valor) / topo }} /></div>
            <span className="nota">{dataCompleta(m.data)}</span>
          </li>
        ))}
        {!lista.length && <li className="nota">Nenhuma {tipo === "saidas" ? "saída" : "entrada"} neste recorte.</li>}
      </ol>
    </div>
  );
}
