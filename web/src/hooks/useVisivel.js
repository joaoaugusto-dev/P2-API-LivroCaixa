import { useEffect, useRef, useState } from "react";

// vira true (e fica) na primeira vez que o elemento aparece na tela: dispara a animacao so quando se ve
export default function useVisivel() {
  const ref = useRef();
  const [visivel, setVisivel] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (visivel || !ref.current) return;
    const o = new IntersectionObserver(([e]) => e.isIntersecting && (setVisivel(true), o.disconnect()), { threshold: 0.15 });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [visivel]);
  return [ref, visivel];
}
