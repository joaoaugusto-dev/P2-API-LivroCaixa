import { useMemo } from "react";
import Grafico from "../Grafico.jsx";
import Tabela from "../componentes/Tabela.jsx";
import Filtros from "../componentes/Filtros.jsx";
import useFiltros from "../hooks/useFiltros.js";
import useContagem from "../useContagem.js";
import useVisivel from "../hooks/useVisivel.js";
import Valor from "../componentes/Valor.jsx";
import GraficoFluxo from "../componentes/GraficoFluxo.jsx";
import Ranking from "../componentes/Ranking.jsx";
import { calcular } from "../Kpis.js";
import { moeda, dataCurta, percentual, plural } from "../format.js";

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

// somente leitura: saldo, grafico, indicadores e a lista
export default function Analise({ extrato }) {
  const { movs, atualizando, destaque, saindo } = extrato;
  const filtros = useFiltros(movs);
  const { cronologicas: recorte, ordenadas, termos, ativos, limpar } = filtros;
  const k = useMemo(() => calcular(recorte), [recorte]);
  const saldoAnimado = useContagem(k.saldo);
  const [refKpis, kpisVisiveis] = useVisivel();

  if (!movs.length) return <Vazio />;

  return (
    <div className="analise">
      <Filtros filtros={filtros} total={movs.length} mostradas={recorte.length} />

      {!recorte.length ? (
        <section className="vazio">
          <h2>Nada encontrado</h2>
          <p>Nenhuma movimentação combina com esses filtros.</p>
          <button className="sec" onClick={limpar}>Limpar filtros</button>
        </section>
      ) : (
      <>
      <section className="hero">
        <div className="hero-saldo">
          <p className="rotulo">{ativos.length ? "Saldo do recorte" : "Saldo calculado"}, de {dataCurta(k.inicio)} a {dataCurta(k.fim)}</p>
          <p className={"valor-grande" + (k.saldo < 0 ? " neg" : "")}>{moeda(saldoAnimado)}</p>
          <Grafico movimentos={recorte} />
        </div>
        <aside className="balanco">
          <div>
            <p className="rotulo">Entradas</p>
            <p className="mono-grande">{moeda(k.entradas)}</p>
            <p className="nota">{plural(k.qtdEntradas, "movimentação", "movimentações")}</p>
          </div>
          <div>
            <p className="rotulo">Saídas</p>
            <p className="mono-grande saida">{moeda(k.saidas)}</p>
            <p className="nota">{plural(k.qtdSaidas, "movimentação", "movimentações")}</p>
          </div>
          <div>
            <p className="rotulo">{k.entradas ? `${percentual(k.comprometido)} das entradas viraram saída` : "Sem entradas neste recorte"}</p>
            <div className="medidor" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(k.comprometido * 100, 100)} aria-label="Parte das entradas gasta">
              <span style={{ "--p": Math.min(k.comprometido, 1) }} />
            </div>
          </div>
        </aside>
      </section>

      <section className="kpis" aria-label="Indicadores" ref={refKpis}>
        <div>
          <p className="rotulo">Maior entrada</p>
          <p className="mono-medio entrada"><Valor valor={k.maiorEntrada?.valor ?? 0} formato={moeda} ativo={kpisVisiveis} /></p>
          <p className="nota">{k.maiorEntrada ? `${cap(k.maiorEntrada.descricao)}, ${dataCurta(k.maiorEntrada.data)}` : "Sem entradas"}</p>
        </div>
        <div>
          <p className="rotulo">Maior saída</p>
          <p className="mono-medio saida"><Valor valor={k.maiorSaida?.valor ?? 0} formato={moeda} ativo={kpisVisiveis} /></p>
          <p className="nota">{k.maiorSaida ? `${cap(k.maiorSaida.descricao)}, ${dataCurta(k.maiorSaida.data)}` : "Sem saídas"}</p>
        </div>
        <div>
          <p className="rotulo">Média por saída</p>
          <p className="mono-medio"><Valor valor={k.mediaSaida} formato={moeda} ativo={kpisVisiveis} /></p>
          <p className="nota">em {plural(k.qtdSaidas, "saída", "saídas")}</p>
        </div>
        <div>
          <p className="rotulo">Gasto por dia</p>
          <p className="mono-medio"><Valor valor={k.gastoPorDia} formato={moeda} ativo={kpisVisiveis} /></p>
          <p className="nota">ao longo de {plural(k.dias, "dia", "dias")}</p>
        </div>
        <div>
          <p className="rotulo">Dia mais pesado</p>
          <p className="mono-medio saida"><Valor valor={k.diaMaisPesado?.valor ?? 0} formato={moeda} ativo={kpisVisiveis} /></p>
          <p className="nota">{k.diaMaisPesado ? `${dataCurta(k.diaMaisPesado.data)}, ${plural(k.diaMaisPesado.n, "saída", "saídas")}` : "Sem saídas"}</p>
        </div>
        <div>
          <p className="rotulo">Taxa de sobra</p>
          <p className="mono-medio">{k.sobra == null ? "—" : <Valor valor={k.sobra * 100} formato={(v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"} ativo={kpisVisiveis} />}</p>
          <p className="nota">{k.sobra == null ? "Sem entradas" : "do que entrou ficou na conta"}</p>
        </div>
      </section>

      <section className="graficos">
        <article className="cartao">
          <h3>Entradas e saídas</h3>
          <GraficoFluxo movs={recorte} />
        </article>
        <article className="cartao">
          <h3>Maiores movimentações</h3>
          <Ranking movs={recorte} />
        </article>
      </section>

      <Tabela movs={ordenadas} termos={termos.incluir} atualizando={atualizando} destaque={destaque} saindo={saindo} aoLimpar={limpar} />
      </>
      )}
    </div>
  );
}

export function Vazio() {
  return (
    <section className="vazio">
      <h2>Nenhuma movimentação salva ainda</h2>
      <p>Use o módulo Inserção para importar um extrato .ofx ou lançar uma movimentação.</p>
    </section>
  );
}
