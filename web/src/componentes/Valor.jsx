import useContagem from "../useContagem.js";

// numero que conta ate o valor quando `ativo` (ex.: quando entra na tela)
export default function Valor({ valor, formato, ativo = true }) {
  const v = useContagem(ativo ? valor : 0);
  return formato(v);
}
