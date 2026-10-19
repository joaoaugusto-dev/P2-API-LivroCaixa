import { useRef, useState } from "react";
import FormMovimentacao from "../componentes/FormMovimentacao.jsx";
import Tabela from "../componentes/Tabela.jsx";
import Filtros from "../componentes/Filtros.jsx";
import useFiltros from "../hooks/useFiltros.js";
import { Girar } from "../componentes/Icones.jsx";
import { Vazio } from "./Analise.jsx";
import { moeda, dataCompleta } from "../format.js";

// gerenciar tudo: criar, editar e excluir
export default function Administracao({ extrato }) {
  const { movs, ocupado, salvar, excluir, atualizando, destaque, saindo } = extrato;
  const filtros = useFiltros(movs);
  const dialogoForm = useRef();
  const dialogoExcluir = useRef();
  // o dialogo fica montado ate terminar de fechar, entao guardamos o ultimo alvo
  const [edicao, setEdicao] = useState({ chave: 0, m: null });
  const [alvo, setAlvo] = useState(null);

  const abrirForm = (m) => { setEdicao((e) => ({ chave: e.chave + 1, m })); dialogoForm.current.showModal(); };
  const pedirExclusao = (m) => { setAlvo(m); dialogoExcluir.current.showModal(); };

  const gravar = async (corpo) => {
    const erro = await salvar(corpo, edicao.m?.id);
    if (!erro) dialogoForm.current.close();
    return erro;
  };
  const confirmar = async () => {
    if (await excluir(alvo.id)) dialogoExcluir.current.close();
  };

  return (
    <>
      <div className="cabecalho-modulo">
        <h2>Todas as movimentações</h2>
        <button onClick={() => abrirForm(null)}>Nova movimentação</button>
      </div>

      {movs.length ? (
        <>
          <Filtros filtros={filtros} total={movs.length} mostradas={filtros.ordenadas.length} />
          <Tabela movs={filtros.ordenadas} termos={filtros.termos.incluir} aoLimpar={filtros.limpar} atualizando={atualizando} destaque={destaque} saindo={saindo} onEditar={abrirForm} onExcluir={pedirExclusao} />
        </>
      ) : (
        <Vazio />
      )}

      <dialog ref={dialogoForm}>
        <h2>{edicao.m ? "Editar movimentação" : "Nova movimentação"}</h2>
        <FormMovimentacao
          key={edicao.chave}
          inicial={edicao.m}
          onSalvar={gravar}
          onCancelar={() => dialogoForm.current.close()}
          ocupado={ocupado}
          rotulo={edicao.m ? "Salvar alterações" : "Adicionar"}
        />
      </dialog>

      <dialog ref={dialogoExcluir} className="confirmar">
        {alvo && (
          <>
            <h2>Excluir movimentação?</h2>
            <p className="resumo-exclusao">
              <strong>{alvo.descricao}</strong>
              <span>{dataCompleta(alvo.data)}</span>
              <span className={"mono " + (alvo.valor < 0 ? "saida" : "entrada")}>{moeda(alvo.valor)}</span>
            </p>
            <p className="nota">Ela sai do banco de dados e o saldo é recalculado. Não dá para desfazer.</p>
            <div className="botoes-form">
              <button type="button" className="sec" onClick={() => dialogoExcluir.current.close()} autoFocus>Cancelar</button>
              <button type="button" className="perigo" onClick={confirmar} disabled={ocupado === "excluindo"}>
                {ocupado === "excluindo" ? <><Girar />Excluindo…</> : "Excluir"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
