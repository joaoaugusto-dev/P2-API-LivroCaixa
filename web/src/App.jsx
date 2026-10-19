import { useEffect, useMemo, useRef, useState } from "react";
import Grafico from "./Grafico.jsx";
import { moeda, dataCompleta } from "./format.js";

const FILTROS = [["todas", "Todas"], ["entradas", "Entradas"], ["saidas", "Saídas"]];

export default function App() {
  const [movs, setMovs] = useState(null); // null = carregando
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const input = useRef();

  const carregar = () =>
    fetch("/api/movimentacoes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setMovs(d); setErro(""); })
      .catch(() => setErro("Não consegui falar com a API. Rode `python api.py` na raiz do projeto."));

  useEffect(() => { carregar(); }, []);

  const importar = async (arquivo) => {
    if (!arquivo) return;
    setAviso("");
    const r = await fetch("/api/importar", { method: "POST", body: arquivo });
    const d = await r.json();
    if (!r.ok) return setAviso(d.erro + ". Escolha um arquivo .ofx de extrato.");
    setAviso(
      d.inseridas
        ? `${d.inseridas} movimentações gravadas${d.ignoradas ? `, ${d.ignoradas} já existiam e foram ignoradas` : ""}.`
        : `Nenhuma movimentação nova: as ${d.ignoradas} já estavam salvas.`
    );
    carregar();
  };

  const { entradas, saidas, saldo } = useMemo(() => {
    const l = movs ?? [];
    const e = l.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0);
    const s = l.filter((m) => m.valor < 0).reduce((s, m) => s + m.valor, 0);
    return { entradas: e, saidas: s, saldo: e + s };
  }, [movs]);

  const visiveis = (movs ?? []).filter(
    (m) =>
      (filtro === "todas" || (filtro === "entradas" ? m.valor > 0 : m.valor < 0)) &&
      m.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div
      className={"pagina" + (arrastando ? " arrastando" : "")}
      onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
      onDragLeave={(e) => e.currentTarget === e.target && setArrastando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastando(false); importar(e.dataTransfer.files[0]); }}
    >
      <header>
        <h1>Extrato bancário</h1>
        <button onClick={() => input.current.click()}>Importar arquivo .ofx</button>
        <input ref={input} type="file" accept=".ofx" hidden onChange={(e) => { importar(e.target.files[0]); e.target.value = ""; }} />
      </header>

      <p className={"aviso" + (aviso ? " ativo" : "")} role="status">{aviso || " "}</p>

      {erro && <p className="erro">{erro}</p>}

      {movs && movs.length === 0 && (
        <section className="vazio">
          <h2>Nenhuma movimentação salva ainda</h2>
          <p>Importe um extrato .ofx ou arraste o arquivo para esta página.</p>
        </section>
      )}

      {movs && movs.length > 0 && (
        <>
          <section className="resumo">
            <div className="saldo">
              <p className="rotulo">Saldo calculado</p>
              <p className={"valor-grande " + (saldo < 0 ? "neg" : "")}>{moeda(saldo)}</p>
              <Grafico movimentos={movs} />
            </div>
            <dl className="totais">
              <div><dt>Entradas</dt><dd className="pos">{moeda(entradas)}</dd></div>
              <div><dt>Saídas</dt><dd className="neg">{moeda(saidas)}</dd></div>
              <div><dt>Movimentações</dt><dd>{movs.length}</dd></div>
            </dl>
          </section>

          <section className="lista">
            <div className="barra">
              <div className="filtros" role="group" aria-label="Filtrar por tipo">
                {FILTROS.map(([k, nome]) => (
                  <button key={k} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{nome}</button>
                ))}
              </div>
              <input type="search" placeholder="Buscar descrição" aria-label="Buscar descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <table>
              <thead>
                <tr><th>Data</th><th>Descrição</th><th className="num">Valor</th></tr>
              </thead>
              <tbody>
                {visiveis.map((m) => (
                  <tr key={m.id}>
                    <td>{dataCompleta(m.data)}</td>
                    <td>{m.descricao}</td>
                    <td className={"num " + (m.valor < 0 ? "neg" : "pos")}>{moeda(m.valor)}</td>
                  </tr>
                ))}
                {!visiveis.length && (
                  <tr><td colSpan="3" className="nada">Nenhuma movimentação com esse filtro.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
      {movs === null && !erro && <p className="carregando">Carregando movimentações…</p>}
    </div>
  );
}
