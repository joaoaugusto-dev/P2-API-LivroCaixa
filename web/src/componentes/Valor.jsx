import useContagem from "../useContagem.js";

// Mostra um número formatado que conta até `valor` quando `ativo` fica true (ex.: ao entrar na tela).
// `formato` é a função que transforma o número em texto (moeda, porcentagem...).
export default function Valor({ valor, formato, ativo = true }) {
  const v = useContagem(ativo ? valor : 0);
  return formato(v);
}
