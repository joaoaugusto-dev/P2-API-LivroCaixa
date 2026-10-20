// DETECTOR DE VISIBILIDADE (usado pelos gráficos, ranking e KPIs).
import { useEffect, useRef, useState } from "react";

// Devolve [ref, visivel]: `visivel` vira true (e fica) na primeira vez que o elemento entra na tela.
// Serve para só começar a animação quando a pessoa realmente está vendo o gráfico.
export default function useVisivel() {
  const ref = useRef();
  const [visivel, setVisivel] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (visivel || !ref.current) return;
    // IntersectionObserver = o navegador avisa quando o elemento aparece (pelo menos 15% dele)
    const o = new IntersectionObserver(([e]) => e.isIntersecting && (setVisivel(true), o.disconnect()), { threshold: 0.15 });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [visivel]);
  return [ref, visivel];
}
