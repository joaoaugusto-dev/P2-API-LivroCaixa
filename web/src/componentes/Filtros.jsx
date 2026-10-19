import { useEffect, useRef } from "react";
import Segmentos from "./Segmentos.jsx";
import { Icone } from "./Icones.jsx";
import { ORDENS } from "../hooks/useFiltros.js";
import { PERIODOS } from "../periodos.js";
import { moeda, centavosDe, plural } from "../format.js";

const lupa = <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>;
const fechar = <path d="M18 6 6 18M6 6l12 12" />;
const TIPOS = [["todas", "Todas"], ["entradas", "Entradas"], ["saidas", "Saídas"]];

// valor em centavos; vazio (null) = sem limite
function CampoMoeda({ rotulo, valor, onChange }) {
  return (
    <label>{rotulo}
      <input type="text" inputMode="numeric" autoComplete="off" placeholder="Sem limite" value={valor == null ? "" : moeda(valor / 100)}
        onChange={(e) => { const c = centavosDe(e.target.value); onChange(c || null); }} />
    </label>
  );
}

// busca e filtros de uma lista de movimentacoes; o estado vem de useFiltros
export default function Filtros({ filtros, total, mostradas }) {
  const { f, set, limpar, ativos, avancados, invertido } = filtros;
  const busca = useRef();

  // "/" leva ao campo de busca, como em muitos sistemas
  useEffect(() => {
    const tecla = (e) => {
      if (e.key !== "/" || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      e.preventDefault();
      busca.current.focus();
    };
    addEventListener("keydown", tecla);
    return () => removeEventListener("keydown", tecla);
  }, []);

  return (
    <section className="painel filtros-painel" aria-label="Busca e filtros">
      <div className="linha-busca">
        <label className="busca">
          <span className="sr">Buscar</span>
          <Icone d={lupa} />
          <input ref={busca} type="search" value={f.busca} onChange={(e) => set("busca", e.target.value)}
            placeholder="Buscar por descrição, valor ou data (aperte / para focar)" />
        </label>
        <Segmentos opcoes={TIPOS} valor={f.tipo} onChange={(v) => set("tipo", v)} rotulo="Tipo de movimentação" />
        <label className="ordem">
          <span className="sr">Ordenar por</span>
          <select value={f.ordem} onChange={(e) => set("ordem", e.target.value)}>
            {ORDENS.map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
          </select>
        </label>
      </div>
      <p className="nota dica">Várias palavras: todas precisam aparecer. Use -palavra para excluir e "aspas" para uma frase. Também acha por valor (450) e data (05/10).</p>

      <details className="avancado" open={avancados > 0 || undefined}>
        <summary>Mais filtros{avancados > 0 && <span className="selo">{avancados}</span>}</summary>
        <div className="avancado-corpo">
          <div>
            <p className="rotulo">Período</p>
            <div className="chips" role="group" aria-label="Período">
              {PERIODOS.map(([p, nome]) => (
                <button type="button" key={p} aria-pressed={f.periodo === p} onClick={() => set("periodo", p)}>{nome}</button>
              ))}
            </div>
            {f.periodo === "custom" && (
              <div className="datas">
                <label>De<input type="date" value={f.de} max={f.ate || undefined} onChange={(e) => set("de", e.target.value)} /></label>
                <label>Até<input type="date" value={f.ate} min={f.de || undefined} onChange={(e) => set("ate", e.target.value)} /></label>
              </div>
            )}
          </div>
          <div>
            <p className="rotulo">Faixa de valor (sem considerar o sinal)</p>
            <div className="datas">
              <CampoMoeda rotulo="De" valor={f.min} onChange={(v) => set("min", v)} />
              <CampoMoeda rotulo="Até" valor={f.max} onChange={(v) => set("max", v)} />
            </div>
          </div>
        </div>
      </details>

      <div className="resumo-filtro" aria-live="polite">
        <p>
          {ativos.length ? <>Mostrando <strong>{mostradas}</strong> de {plural(total, "movimentação", "movimentações")}</> : plural(total, "movimentação", "movimentações")}
          {invertido && <span className="aviso-faixa"> O início está depois do fim: ajuste o intervalo.</span>}
        </p>
        {ativos.length > 0 && (
          <div className="chips-ativos">
            {ativos.map((a) => (
              <button type="button" key={a.id} className="chip-ativo" onClick={a.remover} aria-label={`Remover filtro: ${a.rotulo}`}>
                {a.rotulo}<Icone d={fechar} />
              </button>
            ))}
            <button type="button" className="limpar" onClick={limpar}>Limpar tudo</button>
          </div>
        )}
      </div>
    </section>
  );
}
