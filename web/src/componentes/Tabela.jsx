import { Icone, lapis, lixeira } from "./Icones.jsx";
import { sem } from "../hooks/useFiltros.js";
import { moeda, dataCompleta } from "../format.js";

// marca os termos da busca dentro da descricao (ignora acento e caixa)
function Marcado({ texto, termos }) {
  const base = sem(texto);
  if (!termos.length || base.length !== texto.length) return texto;
  const marca = new Array(texto.length).fill(false);
  for (const t of termos) {
    for (let i = base.indexOf(t); t && i !== -1; i = base.indexOf(t, i + 1)) marca.fill(true, i, i + t.length);
  }
  const partes = [];
  for (let i = 0; i < texto.length; ) {
    let j = i;
    while (j < texto.length && marca[j] === marca[i]) j++;
    partes.push(marca[i] ? <mark key={i}>{texto.slice(i, j)}</mark> : texto.slice(i, j));
    i = j;
  }
  return partes;
}

// lista de movimentacoes; so mostra editar/excluir se receber onEditar/onExcluir
export default function Tabela({ movs, atualizando, destaque, saindo, onEditar, onExcluir, termos = [], aoLimpar }) {
  const acoes = onEditar || onExcluir;

  return (
    <section className="lista" aria-busy={atualizando}>
      <table className={acoes ? "com-acoes" : undefined}>
        <thead>
          <tr>
            <th>Data</th><th>Descrição</th><th className="num">Valor</th>
            {acoes && <th><span className="sr">Ações</span></th>}
          </tr>
        </thead>
        <tbody>
          {movs.map((m, i) => (
            <tr key={m.id} style={{ "--i": Math.min(i, 10) }} className={(saindo === m.id ? "saindo " : "") + (destaque.has(m.id) ? "destaque" : "")}>
              <td>{dataCompleta(m.data)}</td>
              <td><Marcado texto={m.descricao} termos={termos} /></td>
              <td className={"num " + (m.valor < 0 ? "saida" : "entrada")}>{moeda(m.valor)}</td>
              {acoes && (
                <td className="botoes">
                  <button className="editar" onClick={() => onEditar(m)} aria-label={`Editar ${m.descricao}`} title="Editar"><Icone d={lapis} /></button>
                  <button className="apagar" onClick={() => onExcluir(m)} aria-label={`Excluir ${m.descricao}`} title="Excluir"><Icone d={lixeira} /></button>
                </td>
              )}
            </tr>
          ))}
          {!movs.length && (
            <tr>
              <td colSpan={acoes ? 4 : 3} className="nada">
                Nenhuma movimentação com esses filtros.
                {aoLimpar && <> <button className="limpar" onClick={aoLimpar}>Limpar filtros</button></>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
