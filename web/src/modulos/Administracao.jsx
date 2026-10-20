// MÓDULO ADMINISTRAÇÃO: criar, editar e excluir movimentações, com busca, filtros e categorias.
import { useRef, useState } from "react";
import FormMovimentacao from "../componentes/FormMovimentacao.jsx";
import Tabela from "../componentes/Tabela.jsx";
import Filtros from "../componentes/Filtros.jsx";
import useFiltros from "../hooks/useFiltros.js";
import { Girar } from "../componentes/Icones.jsx";
import { Vazio } from "./Analise.jsx";
import { moeda, dataCompleta } from "../format.js";

// MÓDULO ADMINISTRAÇÃO (só o Administrador geral): CRUD completo.
// Lista com filtros + botões de editar/excluir; criar e editar usam o mesmo formulário num pop-up,
// e excluir pede confirmação.
export default function Administracao({ extrato }) {
  const { movs, ocupado, salvar, excluir, atualizando, destaque, saindo, categorias, definirCategoria, criarEAtribuir, confirmarCategoria, confirmando } = extrato;
  const filtros = useFiltros(movs, categorias);
  // referências aos dois pop-ups nativos (<dialog>): formulário e confirmação de exclusão
  const dialogoForm = useRef();
  const dialogoExcluir = useRef();
  // o dialogo fica montado ate terminar de fechar, entao guardamos o ultimo alvo
  const [edicao, setEdicao] = useState({ chave: 0, m: null });
  const [alvo, setAlvo] = useState(null);

  // abre o formulário vazio (nova) ou preenchido (editar); a `chave` nova recria o formulário do zero
  const abrirForm = (m) => { setEdicao((e) => ({ chave: e.chave + 1, m })); dialogoForm.current.showModal(); };
  // guarda qual movimentação será apagada e abre o pop-up de confirmação
  const pedirExclusao = (m) => { setAlvo(m); dialogoExcluir.current.showModal(); };

  // grava (cria ou edita conforme houver id) e só fecha o pop-up se não deu erro
  const gravar = async (corpo) => {
    const erro = await salvar(corpo, edicao.m?.id);
    if (!erro) dialogoForm.current.close();
    return erro;
  };
  // confirma a exclusão e fecha o pop-up
  const confirmar = async () => {
    if (await excluir(alvo.id)) dialogoExcluir.current.close();
  };

  return (
    <>
      {/* título e botão de nova movimentação */}
      <div className="cabecalho-modulo">
        <h2>Todas as movimentações</h2>
        <button onClick={() => abrirForm(null)}>Nova movimentação</button>
      </div>

      {/* filtros + tabela com ações; se o banco está vazio, mostra a mensagem de vazio */}
      {movs.length ? (
        <>
          <Filtros filtros={filtros} total={movs.length} mostradas={filtros.ordenadas.length} categorias={categorias} />
          <Tabela movs={filtros.ordenadas} termos={filtros.termos.incluir} aoLimpar={filtros.limpar} atualizando={atualizando} destaque={destaque} saindo={saindo} onEditar={abrirForm} onExcluir={pedirExclusao} categorias={categorias} onCategoria={definirCategoria} onCriarCategoria={criarEAtribuir} onConfirmar={confirmarCategoria} confirmando={confirmando} />
        </>
      ) : (
        <Vazio />
      )}

      {/* POP-UP 1: formulário de criar/editar */}
      <dialog ref={dialogoForm}>
        <h2>{edicao.m ? "Editar movimentação" : "Nova movimentação"}</h2>
        <FormMovimentacao
          key={edicao.chave}
          inicial={edicao.m}
          onSalvar={gravar}
          onCancelar={() => dialogoForm.current.close()}
          ocupado={ocupado}
          rotulo={edicao.m ? "Salvar alterações" : "Adicionar"}
          categorias={categorias}
        />
      </dialog>

      {/* POP-UP 2: confirmação de exclusão, mostrando qual movimentação será apagada */}
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
