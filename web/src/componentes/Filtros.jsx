// PAINEL DE BUSCA E FILTROS: campo de busca, tipo, ordenação, período, faixa de valor e categoria (a lógica está em hooks/useFiltros.js).
import { useEffect, useRef, useState } from "react";
import Segmentos from "./Segmentos.jsx";
import { Icone } from "./Icones.jsx";
import { ORDENS } from "../hooks/useFiltros.js";
import { PERIODOS } from "../periodos.js";
import { moeda, centavosDe } from "../format.js";

// Ícones SVG da busca (lupa) e do chip removível (×); TIPOS = opções do seletor Todas/Entradas/Saídas
const lupa = <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>;
const fechar = <path d="M18 6 6 18M6 6l12 12" />;
// Opções do seletor Todas / Entradas / Saídas
const TIPOS = [["todas", "Todas"], ["entradas", "Entradas"], ["saidas", "Saídas"]];

// Campo de dinheiro com máscara para a faixa de valor. Guarda centavos; vazio (null) = sem limite.
function CampoMoeda({ rotulo, valor, onChange }) {
  return (
    <label>{rotulo}
      <input type="text" inputMode="numeric" autoComplete="off" placeholder="Sem limite" value={valor == null ? "" : moeda(valor / 100)}
        onChange={(e) => { const c = centavosDe(e.target.value); onChange(c || null); }} />
    </label>
  );
}

// Painel de busca e filtros. Só desenha: o estado e a lógica vêm do hook useFiltros.
// `total` = todas as movimentações; `mostradas` = quantas passaram nos filtros.
export default function Filtros({ filtros, total, mostradas, categorias = [] }) {
  const { f, set, limpar, ativos, avancados, invertido } = filtros;
  const busca = useRef();
  const [aberto, setAberto] = useState(false);

  // Atalho de teclado: apertar "/" foca o campo de busca (se a pessoa não estiver digitando em outro campo)
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
      {/* LINHA PRINCIPAL: busca, tipo, ordenação e botão que abre os filtros avançados */}
      <div className="linha-busca">
        <label className="busca">
          <span className="sr">Buscar</span>
          <Icone d={lupa} />
          <input ref={busca} type="search" value={f.busca} onChange={(e) => set("busca", e.target.value)} placeholder="Buscar descrição, valor ou data" />
          {/* dica de uso: só aparece quando o campo está em foco */}
          <span className="ajuda-busca" role="note">
            Várias palavras: todas precisam aparecer. <b>-palavra</b> exclui, <b>"aspas"</b> para uma frase. Aceita valor (450) e data (05/10). Tecla <b>/</b> foca aqui.
          </span>
        </label>
        <Segmentos opcoes={TIPOS} valor={f.tipo} onChange={(v) => set("tipo", v)} rotulo="Tipo de movimentação" />
        <label className="ordem">
          <span className="sr">Ordenar por</span>
          <select value={f.ordem} onChange={(e) => set("ordem", e.target.value)}>
            {ORDENS.map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
          </select>
        </label>
        <button type="button" className="btn-filtros" aria-expanded={aberto} aria-controls="filtros-avancados" onClick={() => setAberto(!aberto)}>
          Filtros{avancados > 0 && <span className="selo">{avancados}</span>}
        </button>
      </div>

      {/* FILTROS AVANÇADOS (abre deslizando): período e faixa de valor */}
      <div id="filtros-avancados" className={"avancado" + (aberto ? " aberto" : "")}>
        <div className="avancado-interno">
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
              <p className="rotulo">Categoria</p>
              <select className="sel-cat" value={String(f.categoria)} aria-label="Filtrar por categoria"
                onChange={(e) => set("categoria", e.target.value === "todas" || e.target.value === "sem" ? e.target.value : Number(e.target.value))}>
                <option value="todas">Todas as categorias</option>
                <option value="sem">Sem categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <p className="rotulo">Faixa de valor (sem o sinal)</p>
              <div className="datas">
                <CampoMoeda rotulo="De" valor={f.min} onChange={(v) => set("min", v)} />
                <CampoMoeda rotulo="Até" valor={f.max} onChange={(v) => set("max", v)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RESUMO: quantos passaram + um chip removível para cada filtro ligado */}
      {(ativos.length > 0 || invertido) && (
        <div className="resumo-filtro" aria-live="polite">
          <span>Mostrando <strong>{mostradas}</strong> de {total}</span>
          {invertido && <span className="aviso-faixa">O início está depois do fim: ajuste o intervalo.</span>}
          {ativos.map((a) => (
            <button type="button" key={a.id} className="chip-ativo" onClick={a.remover} aria-label={`Remover filtro: ${a.rotulo}`}>
              {a.rotulo}<Icone d={fechar} />
            </button>
          ))}
          <button type="button" className="limpar" onClick={limpar}>Limpar tudo</button>
        </div>
      )}
    </section>
  );
}
