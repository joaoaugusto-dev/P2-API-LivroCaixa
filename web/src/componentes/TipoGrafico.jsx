// BOTÕES PARA TROCAR O TIPO DE UM GRÁFICO: uma fileira de botões só com ícone (ex.: degraus | linha | área).
// A escolha de cada gráfico fica salva no navegador, então a pessoa volta e encontra do jeito que deixou.
import { useState } from "react";
import { Icone } from "./Icones.jsx";

// Ícones (traços simples) de cada tipo de gráfico
const ICONES = {
  degraus: <path d="M3 18h5v-5h5V8h8" />,
  linha: <path d="M3 17l5-6 5 3 8-9" />,
  area: <path d="M3 19V13l5-4 5 3 8-7v14Z" />,
  colunas: <path d="M6 20V10M12 20V4M18 20v-8" />,
  linhas: <path d="M3 8l6 3 6-5 6 4M3 18l6-3 6 3 6-4" />,
  liquido: <path d="M6 12v7M12 12V5M18 12v5M3 12h18" />,
  barras: <path d="M4 6h12M4 12h16M4 18h8" />,
  pilha: <path d="M3 8h18v8H3ZM9 8v8M15 8v8" />,
  rosca: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>,
};

// Guarda a escolha no localStorage (se o navegador bloquear, funciona do mesmo jeito, só não lembra)
export function usePreferencia(chave, padrao) {
  const [valor, setValor] = useState(() => {
    try { return localStorage.getItem("grafico:" + chave) || padrao; } catch { return padrao; }
  });
  // guarda o estilo escolhido no estado e no navegador
  const trocar = (v) => {
    setValor(v);
    try { localStorage.setItem("grafico:" + chave, v); } catch {}
  };
  return [valor, trocar];
}

// `opcoes` = lista de [id, rótulo]; o ícone vem do id. `escuro` = versão para fundo escuro (painel principal).
export default function TipoGrafico({ opcoes, valor, onChange, escuro }) {
  return (
    <div className={"tipo-grafico" + (escuro ? " escuro" : "")} role="group" aria-label="Tipo de gráfico">
      {opcoes.map(([id, nome]) => (
        <button type="button" key={id} aria-pressed={id === valor} aria-label={nome} title={nome} onClick={() => onChange(id)}>
          <Icone d={ICONES[id]} />
        </button>
      ))}
    </div>
  );
}
