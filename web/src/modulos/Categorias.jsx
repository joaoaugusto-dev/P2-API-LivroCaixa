// MÓDULO CATEGORIAS (Administrador): revisar o que o sistema classificou, ensinar com um clique e gerenciar categorias.
import { useRef, useState } from "react";
import { ChipCategoria, Cores, Ponto } from "../componentes/Categoria.jsx";
import { Icone, Girar, lapis, lixeira } from "../componentes/Icones.jsx";
import Valor from "../componentes/Valor.jsx";
import { moeda, dataCompleta, plural } from "../format.js";

// Linha de uma categoria: mostra nome, uso e total; o lápis troca para o modo de edição (nome + cor)
function LinhaCategoria({ c, onSalvar, onExcluir }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(c.nome);
  const [cor, setCor] = useState(c.cor);
  const [erro, setErro] = useState("");

  // salva o novo nome/cor (mostra o erro se o nome já existe)
  const salvar = async (e) => {
    e.preventDefault();
    const msg = await onSalvar(c.id, nome.trim(), cor);
    if (msg) return setErro(msg);
    setEditando(false); setErro("");
  };

  if (editando) {
    return (
      <li className="cat-linha editando">
        <form onSubmit={salvar}>
          <input value={nome} maxLength="40" required autoFocus aria-label="Nome da categoria" onChange={(e) => setNome(e.target.value)} />
          <Cores valor={cor} onChange={setCor} />
          {erro && <p className="erro-menu">{erro}</p>}
          <div className="botoes-form">
            <button type="button" className="sec" onClick={() => { setEditando(false); setNome(c.nome); setCor(c.cor); setErro(""); }}>Cancelar</button>
            <button type="submit">Salvar</button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li className="cat-linha">
      <Ponto cor={c.cor} />
      <span className="cat-nome">{c.nome}</span>
      <span className="cat-uso">{plural(c.qtd, "movimentação", "movimentações")}{c.qtd > 0 && `, ${moeda(c.total)}`}</span>
      <span className="cat-acoes">
        <button className="editar" onClick={() => setEditando(true)} aria-label={`Editar ${c.nome}`} title="Editar"><Icone d={lapis} /></button>
        <button className="apagar" onClick={() => onExcluir(c)} aria-label={`Excluir ${c.nome}`} title="Excluir"><Icone d={lixeira} /></button>
      </span>
    </li>
  );
}

// Recebe o objeto `extrato` com os dados e as operações
export default function Categorias({ extrato }) {
  const { movs, categorias, definirCategoria, confirmarTodas, criarEAtribuir, criarCategoria, editarCategoria, excluirCategoria, reaprender, ocupado, confirmando, confirmarCategoria } = extrato;
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(1);
  const [erro, setErro] = useState("");
  const [alvo, setAlvo] = useState(null); // categoria que está para ser excluída
  const dialogo = useRef();

  // 3 grupos: o que a pessoa já definiu, o que o sistema sugeriu e o que ficou sem categoria
  const manuais = movs.filter((m) => m.categoria_id != null && !m.auto).length;
  const sugeridas = movs.filter((m) => m.auto);
  const semCategoria = movs.filter((m) => m.categoria_id == null);
  // fila de revisão: primeiro as sugestões, depois as sem categoria
  const revisar = [...sugeridas, ...semCategoria];
  const emMassa = sugeridas.length > 1 && sugeridas.every((m) => confirmando.has(m.id)); // todas animando = aprovação em massa

  // cria uma categoria nova; a próxima cor livre vem pré-selecionada
  const adicionar = async (e) => {
    e.preventDefault();
    const r = await criarCategoria(nome.trim(), cor);
    if (r.erro) return setErro(r.erro);
    setNome(""); setErro("");
    const usadas = new Set([...categorias.map((c) => c.cor), cor]);
    setCor([1, 2, 3, 4, 5, 6, 7, 8].find((n) => !usadas.has(n)) ?? 1);
  };

  // guarda qual categoria será apagada e abre o pop-up
  const pedirExclusao = (c) => { setAlvo(c); dialogo.current.showModal(); };
  // confirma e fecha o pop-up
  const confirmarExclusao = async () => { if (await excluirCategoria(alvo.id)) dialogo.current.close(); };

  return (
    <div className="analise">
      {/* 1) REVISÃO: o caminho mais rápido para ensinar o sistema */}
      <section className="painel">
        <div className="cabecalho-modulo">
          <h2>Revisar classificações</h2>
          <div className="acoes">
            {/* aprovação em massa: as linhas confirmam em cascata e saem da lista */}
            {sugeridas.length > 0 && (
              <button className={emMassa ? "aprovando" : ""} disabled={emMassa} onClick={() => confirmarTodas(sugeridas)}>
                {emMassa ? <><Girar />Aprovando…</> : `Confirmar ${plural(sugeridas.length, "sugestão", "sugestões")}`}
              </button>
            )}
            <button className="sec" onClick={reaprender} disabled={ocupado === "aprendendo"}>
              {ocupado === "aprendendo" ? <><Girar />Reaprendendo…</> : "Reaprender"}
            </button>
          </div>
        </div>
        <p className="resumo-aprendizado">
          {/* os números contam até o novo valor quando a pessoa confirma */}
          <strong><Valor valor={manuais} formato={(v) => Math.round(v)} /></strong> definidas por você, <strong><Valor valor={sugeridas.length} formato={(v) => Math.round(v)} /></strong> sugeridas pelo sistema e <strong>{semCategoria.length}</strong> sem categoria.
        </p>
        {revisar.length === 0 ? (
          <div className="tudo-revisado">
            {/* o círculo e o ✓ se desenham quando a fila esvazia */}
            <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23" pathLength="1" /><path d="M15 27l7 7 15-16" pathLength="1" /></svg>
            <div>
              <strong>Tudo revisado</strong>
              <p className="nota">Quando entrarem movimentações novas, o sistema sugere a categoria e elas aparecem aqui.</p>
            </div>
          </div>
        ) : (
          <ul className="revisao">
            {/* cada linha: ao confirmar, pisca em verde, o ✓ "estala" e a linha recolhe (em cascata se for em massa) */}
            {revisar.map((m) => (
              <li key={m.id} className={"rev-li" + (confirmando.has(m.id) ? " confirmando" : "")} style={{ "--d": confirmando.get(m.id) ?? 0 }}>
                {/* .rev-colapsa encolhe até 0 (o espaçamento fica dentro do .rev-corpo, que é recortado) */}
                <div className="rev-colapsa"><div className="rev-corpo">
                  <div className="rev-texto">
                    <strong>{m.descricao}</strong>
                    <span>{dataCompleta(m.data)}</span>
                  </div>
                  <span className={"rev-valor " + (m.valor < 0 ? "saida" : "entrada")}>{moeda(m.valor)}</span>
                  <ChipCategoria mov={m} categorias={categorias} onEscolher={(id) => definirCategoria(m.id, id)} onCriar={(n) => criarEAtribuir(m.id, n)} onConfirmar={confirmarCategoria} confirmando={confirmando.has(m.id)} />
                </div></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2) CATEGORIAS: criar, renomear, trocar a cor e excluir */}
      <section className="painel">
        <h2>Suas categorias</h2>
        <ul className="cat-lista">
          {categorias.map((c) => <LinhaCategoria key={c.id} c={c} onSalvar={editarCategoria} onExcluir={pedirExclusao} />)}
        </ul>
        <form className="cat-nova" onSubmit={adicionar}>
          <input value={nome} maxLength="40" required placeholder="Nova categoria (ex.: Marketing)" aria-label="Nome da nova categoria" onChange={(e) => { setNome(e.target.value); setErro(""); }} />
          <Cores valor={cor} onChange={setCor} />
          <button type="submit">Adicionar</button>
        </form>
        {erro && <p className="erro-menu">{erro}</p>}
      </section>

      {/* 3) EXPLICAÇÃO: como o sistema aprende (útil para apresentar) */}
      <section className="painel como-aprende">
        <h2>Como o sistema aprende</h2>
        <ol>
          <li>Ele lê as <strong>palavras da descrição</strong> (e se é entrada ou saída) e compara com as que já viu em cada categoria.</li>
          <li>Cada vez que você <strong>confirma ou troca</strong> uma categoria, ela vira um exemplo e as sugestões são recalculadas na hora.</li>
          <li>Só aplica sozinho quando está <strong>pelo menos 60% seguro</strong>. Abaixo disso, deixa sem categoria para você decidir.</li>
          <li>As sugestões automáticas <strong>não entram no treino</strong>: o sistema só aprende com o que você confirmou.</li>
        </ol>
      </section>

      {/* pop-up de confirmação ao excluir uma categoria */}
      <dialog ref={dialogo} className="confirmar">
        {alvo && (
          <>
            <h2>Excluir categoria?</h2>
            <p className="resumo-exclusao"><strong>{alvo.nome}</strong><span>{plural(alvo.qtd, "movimentação perde", "movimentações perdem")} esta categoria.</span></p>
            <p className="nota">O sistema tenta classificá-las de novo. Não dá para desfazer.</p>
            <div className="botoes-form">
              <button type="button" className="sec" onClick={() => dialogo.current.close()} autoFocus>Cancelar</button>
              <button type="button" className="perigo" onClick={confirmarExclusao}>Excluir</button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
