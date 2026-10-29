// CONTADOR ANIMADO: usado no saldo e nos KPIs para os números subirem até o valor.
import { useEffect, useRef, useState } from "react";

// Devolve um número que "conta" de onde estava até `alvo` em ~0,9 s (começa rápido e desacelera).
// Se a pessoa pediu menos movimento no sistema, pula direto para o valor final.
export default function useContagem(alvo, ms = 900) {
  const [v, setV] = useState(0);
  const atual = useRef(0);
  useEffect(() => {
    // respeita "reduzir movimento"
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(alvo);
    const de = atual.current, t0 = performance.now();
    let id;
    // a cada quadro da tela, calcula quanto do caminho já foi percorrido (p vai de 0 a 1)
    const passo = (t) => {
      const p = Math.min(Math.max((t - t0) / ms, 0), 1);
      atual.current = de + (alvo - de) * (1 - Math.pow(1 - p, 4));
      setV(atual.current);
      if (p < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id); // se o alvo mudar no meio, cancela a contagem anterior
  }, [alvo, ms]);
  return v;
}
