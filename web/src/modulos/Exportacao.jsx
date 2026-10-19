import { URL_EXPORTAR } from "../api.js";
import { calcular } from "../Kpis.js";
import { moeda, dataCompleta } from "../format.js";

// baixa o que esta no banco como .ofx (pode ser reimportado sem duplicar)
export default function Exportacao({ extrato }) {
  const { movs } = extrato;
  const k = calcular(movs);

  return (
    <section className="painel exportar">
      <h2>Exportar extrato</h2>
      {movs.length ? (
        <dl className="resumo-export">
          <div><dt>Movimentações</dt><dd>{movs.length}</dd></div>
          <div><dt>Período</dt><dd>{dataCompleta(k.inicio)} a {dataCompleta(k.fim)}</dd></div>
          <div><dt>Saldo calculado</dt><dd>{moeda(k.saldo)}</dd></div>
        </dl>
      ) : (
        <p className="nota">Não há movimentações para exportar. Importe ou lance algumas no módulo Inserção.</p>
      )}
      <p className="nota">O arquivo segue o formato OFX dos bancos. Se for importado de novo, tudo é reconhecido como já existente.</p>
      <a className="botao" href={movs.length ? URL_EXPORTAR : undefined} download aria-disabled={!movs.length}>Baixar .ofx</a>
    </section>
  );
}
