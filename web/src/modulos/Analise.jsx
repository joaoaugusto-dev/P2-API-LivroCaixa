import { useMemo } from "react";
import Grafico from "../Grafico.jsx";
import Tabela from "../componentes/Tabela.jsx";
import useContagem from "../useContagem.js";
import { calcular } from "../Kpis.js";
import { moeda, dataCurta, percentual } from "../format.js";

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

// somente leitura: saldo, grafico, indicadores e a lista
export default function Analise({ extrato }) {
  const { movs, atualizando, destaque, saindo } = extrato;
  const k = useMemo(() => calcular(movs), [movs]);
  const saldoAnimado = useContagem(k.saldo);

  if (!movs.length) return <Vazio />;

  return (
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
              <span style={{ "--p": Math.min(k.comprometido, 1) }} />
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

      <Tabela movs={movs} atualizando={atualizando} destaque={destaque} saindo={saindo} />
    </>
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
