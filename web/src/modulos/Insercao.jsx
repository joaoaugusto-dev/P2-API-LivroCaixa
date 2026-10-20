// MÓDULO INSERÇÃO: lançar à mão ou importar um .ofx, e ver as últimas inseridas com suas categorias.
import { useRef, useState } from "react";
import FormMovimentacao from "../componentes/FormMovimentacao.jsx";
import Tabela from "../componentes/Tabela.jsx";
import { Girar } from "../componentes/Icones.jsx";

// MÓDULO INSERÇÃO: duas formas de colocar dados no sistema: lançar à mão ou importar um arquivo .ofx.
export default function Insercao({ extrato }) {
  const { movs, ocupado, salvar, importar, atualizando, destaque, saindo, categorias, definirCategoria, criarEAtribuir, confirmarCategoria, confirmando } = extrato;
  const input = useRef();
  const [arrastando, setArrastando] = useState(false);
  // as 5 últimas movimentações gravadas, para a pessoa ver o resultado na hora
  const recentes = (movs ?? []).slice().sort((a, b) => b.id - a.id).slice(0, 5);

  return (
    <>
      {/* DUAS COLUNAS: formulário manual | importação */}
      <div className="duas-colunas">
        <section className="painel">
          <h2>Lançar movimentação</h2>
          <FormMovimentacao onSalvar={(corpo) => salvar(corpo)} ocupado={ocupado} reiniciar categorias={categorias} />
        </section>

        {/* área de soltar arquivo: arrastar o .ofx ou clicar para escolher; duplicadas são ignoradas */}
        <section className="painel">
          <h2>Importar extrato</h2>
          <div
            className={"soltar" + (arrastando ? " ativo" : "")}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); importar(e.dataTransfer.files[0]); }}
          >
            <p>Arraste um arquivo <strong>.ofx</strong> até aqui</p>
            <p className="nota">Movimentações que já estão salvas são ignoradas, sem duplicar.</p>
            <button onClick={() => input.current.click()} disabled={ocupado === "importando"}>
              {ocupado === "importando" ? <><Girar />Importando…</> : "Escolher arquivo"}
            </button>
            <input ref={input} type="file" accept=".ofx" hidden onChange={(e) => { importar(e.target.files[0]); e.target.value = ""; }} />
          </div>
        </section>
      </div>

      {/* últimas inseridas (aparece quando já há dados) */}
      {recentes.length > 0 && (
        <section className="recentes">
          <h2>Últimas inseridas</h2>
          <Tabela movs={recentes} atualizando={atualizando} destaque={destaque} saindo={saindo} categorias={categorias} onCategoria={definirCategoria} onCriarCategoria={criarEAtribuir} onConfirmar={confirmarCategoria} confirmando={confirmando} />
        </section>
      )}
    </>
  );
}
