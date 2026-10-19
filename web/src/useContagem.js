import { useEffect, useRef, useState } from "react";

// anima o numero ate o novo valor (uma vez por mudanca); sem animacao se o usuario pediu menos movimento
export default function useContagem(alvo, ms = 900) {
  const [v, setV] = useState(0);
  const atual = useRef(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(alvo);
    const de = atual.current, t0 = performance.now();
    let id;
    const passo = (t) => {
      const p = Math.min((t - t0) / ms, 1);
      atual.current = de + (alvo - de) * (1 - Math.pow(1 - p, 4));
      setV(atual.current);
      if (p < 1) id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [alvo, ms]);
  return v;
}
