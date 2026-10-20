// mesma estrutura da pagina, para nao haver salto quando os dados chegam
export default function Esqueleto({ demora, completo = true }) {
  return (
    <div className={"esqueleto" + (completo ? " analise" : "")} role="status">
      <span className="sr">Carregando movimentações…</span>
      {completo && (
        <>
          <section className="hero">
            <div>
              <span className="bloco b-rotulo" />
              <span className="bloco b-saldo" />
              <span className="bloco b-grafico" />
            </div>
            <aside className="balanco">
              {[0, 1, 2].map((i) => <div key={i}><span className="bloco b-rotulo" /><span className="bloco b-valor" /></div>)}
            </aside>
          </section>
          <section className="kpis">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i}><span className="bloco b-rotulo" /><span className="bloco b-valor" /><span className="bloco b-nota" /></div>)}
          </section>
          <section className="graficos">
            <article className="cartao"><span className="bloco b-rotulo" /><span className="bloco b-grafico" style={{ marginTop: 16 }} /></article>
            <article className="cartao"><span className="bloco b-rotulo" />{[0, 1, 2, 3].map((i) => <span key={i} className="bloco b-linha" style={{ height: 30 }} />)}</article>
          </section>
        </>
      )}
      <section className="lista">
        {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="bloco b-linha" />)}
      </section>
      <p className={"demora" + (demora ? " ativo" : "")}>O banco de dados estava dormindo e está acordando. Isso leva alguns segundos.</p>
    </div>
  );
}
