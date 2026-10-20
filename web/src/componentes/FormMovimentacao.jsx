import { useState } from "react";
import { Girar } from "./Icones.jsx";
import { moeda, centavosDe } from "../format.js";

// Data de hoje no formato AAAA-MM-DD (valor padrão do campo Data)
const hoje = () => new Date().toISOString().slice(0, 10);

// Formulário usado para criar (Inserção/Administração) e editar (Administração).
// `inicial` = movimentação a editar; `onSalvar` devolve o texto do erro, ou nada se deu certo.
export default function FormMovimentacao({ inicial, onSalvar, onCancelar, ocupado, rotulo = "Adicionar", reiniciar, categorias = [] }) {
  // estado do formulário: o valor é guardado em centavos (inteiro) para a máscara de dinheiro
  const vazio = { data: hoje(), tipo: "saida", centavos: 0, descricao: "", categoria: "auto" };
  const [f, setF] = useState(
    inicial
      ? { data: inicial.data, tipo: inicial.valor < 0 ? "saida" : "entrada", centavos: Math.round(Math.abs(inicial.valor) * 100), descricao: inicial.descricao }
      : vazio
  );
  const [erro, setErro] = useState("");

  // Ao enviar: valida o valor, transforma Entrada/Saída em sinal (+/−) e chama onSalvar
  const enviar = async (e) => {
    e.preventDefault();
    if (!f.centavos) return setErro("Informe um valor maior que zero.");
    const valor = (f.tipo === "saida" ? -f.centavos : f.centavos) / 100;
    // categoria "auto" = deixa o sistema sugerir; qualquer outra vale como escolha da pessoa
    const msg = await onSalvar({ data: f.data, valor, descricao: f.descricao, ...(f.categoria !== "auto" && { categoria_id: Number(f.categoria) }) });
    if (msg) return setErro(msg);
    setErro("");
    if (reiniciar) setF(vazio);
  };

  return (
    <form onSubmit={enviar}>
      {/* seletor Entrada | Saída (substitui digitar o sinal de menos) */}
      <div className="tipo" role="radiogroup" aria-label="Tipo" data-tipo={f.tipo} style={{ "--i": f.tipo === "saida" ? 1 : 0 }}>
        {[["entrada", "Entrada"], ["saida", "Saída"]].map(([t, nome]) => (
          <button type="button" role="radio" key={t} aria-checked={f.tipo === t} onClick={() => setF({ ...f, tipo: t })}>{nome}</button>
        ))}
      </div>
      {/* valor com máscara: o que se digita vira centavos e aparece como R$ 1.234,56 */}
      <label>Valor
        <input className="valor-input" type="text" inputMode="numeric" autoComplete="off" value={moeda(f.centavos / 100)} onChange={(e) => setF({ ...f, centavos: centavosDe(e.target.value) })} />
      </label>
      <label>Data<input type="date" required value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
      <label>Descrição<input type="text" required maxLength="255" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></label>
      {/* erro de validação ou de conexão */}
      {/* categoria: só ao criar (para editar, use o chip da tabela). "Automática" = o sistema sugere. */}
      {!inicial && categorias.length > 0 && (
        <label>Categoria
          <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            <option value="auto">Automática (o sistema sugere)</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
      )}
      {erro && <p className="erro">{erro}</p>}
      <div className="botoes-form">
        {onCancelar && <button type="button" className="sec" onClick={onCancelar}>Cancelar</button>}
        <button type="submit" disabled={ocupado === "salvando"}>
          {ocupado === "salvando" ? <><Girar />Salvando…</> : rotulo}
        </button>
      </div>
    </form>
  );
}
