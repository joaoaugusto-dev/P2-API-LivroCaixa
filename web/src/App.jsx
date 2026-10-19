import { useEffect, useMemo, useRef, useState } from "react";
import Grafico from "./Grafico.jsx";
import useContagem from "./useContagem.js";
import { calcular } from "./Kpis.js";
import { moeda, dataCurta, dataCompleta, percentual, centavosDe } from "./format.js";

const FILTROS = [["todas", "Todas"], ["entradas", "Entradas"], ["saidas", "Saídas"]];

const Icone = ({ d }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const lapis = <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />;
const lixeira = <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" />;

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" />
      <path d="M6 23h6v-6h5v-5h9" />
    </svg>
  );
}

export default function App() {
  const [movs, setMovs] = useState(null); // null = carregando
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const input = useRef();
  const dialogo = useRef();
  const [form, setForm] = useState(null); // null = fechado; {id?, data, tipo, centavos, descricao}
  const [erroForm, setErroForm] = useState("");
  const [excluindo, setExcluindo] = useState(null); // movimentacao aguardando confirmacao
  const confirmacao = useRef();

  const carregar = () =>
    fetch("/api/movimentacoes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setMovs(d); setErro(""); })
      .catch(() => setErro("Não consegui falar com a API. Rode `python api.py` na raiz do projeto."));

  useEffect(() => { carregar(); }, []);

  const abrir = (m) => {
    setErroForm("");
    setForm(
      m
        ? { id: m.id, data: m.data, tipo: m.valor < 0 ? "saida" : "entrada", centavos: Math.round(Math.abs(m.valor) * 100), descricao: m.descricao }
        : { data: new Date().toISOString().slice(0, 10), tipo: "saida", centavos: 0, descricao: "" }
    );
    dialogo.current.showModal();
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!form.centavos) return setErroForm("Informe um valor maior que zero.");
    const { id, tipo, centavos, ...resto } = form;
    const valor = (tipo === "saida" ? -centavos : centavos) / 100;
    const r = await fetch("/api/movimentacoes" + (id ? "/" + id : ""), { method: id ? "PUT" : "POST", body: JSON.stringify({ ...resto, valor }) });
    if (!r.ok) return setErroForm((await r.json()).erro);
    dialogo.current.close();
    setAviso(id ? "Movimentação atualizada." : "Movimentação adicionada.");
    carregar();
  };

  const pedirExclusao = (m) => { setExcluindo(m); confirmacao.current.showModal(); };

  const excluir = async () => {
    await fetch("/api/movimentacoes/" + excluindo.id, { method: "DELETE" });
    confirmacao.current.close();
    setAviso("Movimentação excluída.");
    carregar();
  };

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

  const k = useMemo(() => calcular(movs ?? []), [movs]);
  const saldoAnimado = useContagem(k.saldo);

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
      <header className="topo">
        <div className="marca">
          <Logo />
          <div>
            <h1>Livro-caixa</h1>
            <p>Extrato OFX no seu banco de dados</p>
          </div>
        </div>
        <div className="acoes">
          <button className="sec" onClick={() => abrir()}>Nova movimentação</button>
          <a className="botao sec" href="/api/exportar" download>Exportar .ofx</a>
          <button onClick={() => input.current.click()}>Importar .ofx</button>
        </div>
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
          <section className="hero">
            <div className="hero-saldo">
              <p className="rotulo">Saldo calculado, de {dataCurta(k.inicio)} a {dataCurta(k.fim)}</p>
              <p className={"valor-grande" + (k.saldo < 0 ? " neg" : "")}>{moeda(saldoAnimado)}</p>
              <Grafico movimentos={movs} />
            </div>
            <aside className="balanco">
              <div>
                <p className="rotulo">Entradas</p>
                <p className="mono-grande">{moeda(k.entradas)}</p>
                <p className="nota">{k.qtdEntradas} movimentações</p>
              </div>
              <div>
                <p className="rotulo">Saídas</p>
                <p className="mono-grande saida">{moeda(k.saidas)}</p>
                <p className="nota">{k.qtdSaidas} movimentações</p>
              </div>
              <div>
                <p className="rotulo">{percentual(k.comprometido)} das entradas viraram saída</p>
                <div className="medidor" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(k.comprometido * 100, 100)} aria-label="Parte das entradas gasta">
                  <span style={{ width: Math.min(k.comprometido * 100, 100) + "%" }} />
                </div>
              </div>
            </aside>
          </section>

          <section className="kpis" aria-label="Indicadores">
            <div>
              <p className="rotulo">Maior entrada</p>
              <p className="mono-medio entrada">{moeda(k.maiorEntrada?.valor ?? 0)}</p>
              <p className="nota">{k.maiorEntrada ? `${cap(k.maiorEntrada.descricao)}, ${dataCurta(k.maiorEntrada.data)}` : "Sem entradas"}</p>
            </div>
            <div>
              <p className="rotulo">Maior saída</p>
              <p className="mono-medio saida">{moeda(k.maiorSaida?.valor ?? 0)}</p>
              <p className="nota">{k.maiorSaida ? `${cap(k.maiorSaida.descricao)}, ${dataCurta(k.maiorSaida.data)}` : "Sem saídas"}</p>
            </div>
            <div>
              <p className="rotulo">Média por saída</p>
              <p className="mono-medio">{moeda(k.mediaSaida)}</p>
              <p className="nota">em {k.qtdSaidas} saídas</p>
            </div>
            <div>
              <p className="rotulo">Gasto por dia</p>
              <p className="mono-medio">{moeda(k.gastoPorDia)}</p>
              <p className="nota">ao longo de {k.dias} dias</p>
            </div>
          </section>

          <section className="lista">
            <div className="barra">
              <div className="filtros" role="group" aria-label="Filtrar por tipo">
                {FILTROS.map(([f, nome]) => (
                  <button key={f} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{nome}</button>
                ))}
              </div>
              <input type="search" placeholder="Buscar descrição" aria-label="Buscar descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <table>
              <thead>
                <tr><th>Data</th><th>Descrição</th><th className="num">Valor</th><th><span className="sr">Ações</span></th></tr>
              </thead>
              <tbody>
                {visiveis.map((m) => (
                  <tr key={m.id}>
                    <td>{dataCompleta(m.data)}</td>
                    <td>{m.descricao}</td>
                    <td className={"num " + (m.valor < 0 ? "saida" : "entrada")}>{moeda(m.valor)}</td>
                    <td className="botoes">
                      <button className="editar" onClick={() => abrir(m)} aria-label={`Editar ${m.descricao}`} title="Editar"><Icone d={lapis} /></button>
                      <button className="apagar" onClick={() => pedirExclusao(m)} aria-label={`Excluir ${m.descricao}`} title="Excluir"><Icone d={lixeira} /></button>
                    </td>
                  </tr>
                ))}
                {!visiveis.length && <tr><td colSpan="4" className="nada">Nenhuma movimentação com esse filtro.</td></tr>}
              </tbody>
            </table>
          </section>
        </>
      )}

      <dialog ref={dialogo} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={salvar}>
            <h2>{form.id ? "Editar movimentação" : "Nova movimentação"}</h2>
            <div className="tipo" role="radiogroup" aria-label="Tipo">
              {[["entrada", "Entrada"], ["saida", "Saída"]].map(([t, nome]) => (
                <button type="button" role="radio" key={t} aria-checked={form.tipo === t} data-tipo={t} onClick={() => setForm({ ...form, tipo: t })}>{nome}</button>
              ))}
            </div>
            <label>Valor
              <input className="valor-input" type="text" inputMode="numeric" autoComplete="off" value={moeda(form.centavos / 100)} onChange={(e) => setForm({ ...form, centavos: centavosDe(e.target.value) })} />
            </label>
            <label>Data<input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
            <label>Descrição<input type="text" required maxLength="255" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label>
            {erroForm && <p className="erro">{erroForm}</p>}
            <div className="botoes-form">
              <button type="button" className="sec" onClick={() => dialogo.current.close()}>Cancelar</button>
              <button type="submit">{form.id ? "Salvar alterações" : "Adicionar"}</button>
            </div>
          </form>
        )}
      </dialog>
      <dialog ref={confirmacao} className="confirmar" onClose={() => setExcluindo(null)}>
        {excluindo && (
          <>
            <h2>Excluir movimentação?</h2>
            <p className="resumo-exclusao">
              <strong>{excluindo.descricao}</strong>
              <span>{dataCompleta(excluindo.data)}</span>
              <span className={"mono " + (excluindo.valor < 0 ? "saida" : "entrada")}>{moeda(excluindo.valor)}</span>
            </p>
            <p className="nota">Ela sai do banco de dados e o saldo é recalculado. Não dá para desfazer.</p>
            <div className="botoes-form">
              <button type="button" className="sec" onClick={() => confirmacao.current.close()} autoFocus>Cancelar</button>
              <button type="button" className="perigo" onClick={excluir}>Excluir</button>
            </div>
          </>
        )}
      </dialog>
      {movs === null && !erro && <p className="carregando">Carregando movimentações…</p>}
    </div>
  );
}
