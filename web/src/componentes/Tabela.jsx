import { useState } from "react";
import { Icone, lapis, lixeira } from "./Icones.jsx";
import { moeda, dataCompleta } from "../format.js";

const FILTROS = [["todas", "Todas"], ["entradas", "Entradas"], ["saidas", "Saídas"]];

// lista com filtro e busca; so mostra editar/excluir se receber onEditar/onExcluir
export default function Tabela({ movs, atualizando, destaque, saindo, onEditar, onExcluir }) {
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const acoes = onEditar || onExcluir;

  const visiveis = movs.filter(
    (m) =>
      (filtro === "todas" || (filtro === "entradas" ? m.valor > 0 : m.valor < 0)) &&
      m.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <section className="lista" aria-busy={atualizando}>
      <div className="barra">
        <div className="filtros" role="group" aria-label="Filtrar por tipo" style={{ "--i": FILTROS.findIndex(([f]) => f === filtro), "--n": 3 }}>
          {FILTROS.map(([f, nome]) => (
            <button key={f} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{nome}</button>
          ))}
        </div>
        <input type="search" placeholder="Buscar descrição" aria-label="Buscar descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Descrição</th><th className="num">Valor</th>
            {acoes && <th><span className="sr">Ações</span></th>}
          </tr>
        </thead>
        <tbody>
          {visiveis.map((m, i) => (
            <tr key={m.id} style={{ "--i": Math.min(i, 10) }} className={(saindo === m.id ? "saindo " : "") + (destaque.has(m.id) ? "destaque" : "")}>
              <td>{dataCompleta(m.data)}</td>
              <td>{m.descricao}</td>
              <td className={"num " + (m.valor < 0 ? "saida" : "entrada")}>{moeda(m.valor)}</td>
              {acoes && (
                <td className="botoes">
                  <button className="editar" onClick={() => onEditar(m)} aria-label={`Editar ${m.descricao}`} title="Editar"><Icone d={lapis} /></button>
                  <button className="apagar" onClick={() => onExcluir(m)} aria-label={`Excluir ${m.descricao}`} title="Excluir"><Icone d={lixeira} /></button>
                </td>
              )}
            </tr>
          ))}
          {!visiveis.length && <tr><td colSpan={acoes ? 4 : 3} className="nada">Nenhuma movimentação com esse filtro.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}
