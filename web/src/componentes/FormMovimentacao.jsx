import { useState } from "react";
import { Girar } from "./Icones.jsx";
import { moeda, centavosDe } from "../format.js";

const hoje = () => new Date().toISOString().slice(0, 10);

// formulario de criar/editar; `onSalvar` devolve o texto do erro (ou nada se deu certo)
export default function FormMovimentacao({ inicial, onSalvar, onCancelar, ocupado, rotulo = "Adicionar", reiniciar }) {
  const vazio = { data: hoje(), tipo: "saida", centavos: 0, descricao: "" };
  const [f, setF] = useState(
    inicial
      ? { data: inicial.data, tipo: inicial.valor < 0 ? "saida" : "entrada", centavos: Math.round(Math.abs(inicial.valor) * 100), descricao: inicial.descricao }
      : vazio
  );
  const [erro, setErro] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.centavos) return setErro("Informe um valor maior que zero.");
    const valor = (f.tipo === "saida" ? -f.centavos : f.centavos) / 100;
    const msg = await onSalvar({ data: f.data, valor, descricao: f.descricao });
    if (msg) return setErro(msg);
    setErro("");
    if (reiniciar) setF(vazio);
  };

  return (
    <form onSubmit={enviar}>
      <div className="tipo" role="radiogroup" aria-label="Tipo" data-tipo={f.tipo} style={{ "--i": f.tipo === "saida" ? 1 : 0 }}>
        {[["entrada", "Entrada"], ["saida", "Saída"]].map(([t, nome]) => (
          <button type="button" role="radio" key={t} aria-checked={f.tipo === t} onClick={() => setF({ ...f, tipo: t })}>{nome}</button>
        ))}
      </div>
      <label>Valor
        <input className="valor-input" type="text" inputMode="numeric" autoComplete="off" value={moeda(f.centavos / 100)} onChange={(e) => setF({ ...f, centavos: centavosDe(e.target.value) })} />
      </label>
      <label>Data<input type="date" required value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
      <label>Descrição<input type="text" required maxLength="255" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></label>
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
