import { useEffect, useState } from "react";
import useExtrato from "./hooks/useExtrato.js";
import Esqueleto from "./componentes/Esqueleto.jsx";
import { Logo } from "./componentes/Icones.jsx";
import { MODULOS, PERFIS } from "./perfis.js";
import Analise from "./modulos/Analise.jsx";
import Insercao from "./modulos/Insercao.jsx";
import Exportacao from "./modulos/Exportacao.jsx";
import Administracao from "./modulos/Administracao.jsx";

const TELAS = { analise: Analise, insercao: Insercao, exportacao: Exportacao, administracao: Administracao };

function BotaoTema() {
  const [tema, setTema] = useState(document.documentElement.dataset.tema);
  const alternar = (e) => {
    const novo = tema === "escuro" ? "claro" : "escuro";
    const aplicar = () => { document.documentElement.dataset.tema = novo; setTema(novo); };
    try { localStorage.setItem("tema", novo); } catch {}
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return aplicar();
    if (!document.startViewTransition) {
      const html = document.documentElement;
      html.classList.add("tema-troca");
      aplicar();
      return setTimeout(() => html.classList.remove("tema-troca"), 450);
    }
    // revela o novo tema em circulo a partir do botao clicado
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const raio = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(aplicar).ready.then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.77, 0, 0.175, 1)", pseudoElement: "::view-transition-new(root)" }
      )
    );
  };
  return (
    <button type="button" className="btn-tema" onClick={alternar} aria-label={tema === "escuro" ? "Mudar para o tema claro" : "Mudar para o tema escuro"} title={tema === "escuro" ? "Tema claro" : "Tema escuro"}>
      <svg className="sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg className="lua" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
    </button>
  );
}

const lerPerfil = () => {
  try { return localStorage.getItem("perfil") in PERFIS ? localStorage.getItem("perfil") : "admin"; } catch { return "admin"; }
};

export default function App() {
  const extrato = useExtrato();
  const { movs, erro, setErro, aviso, carregar, demora } = extrato;
  const [perfil, setPerfil] = useState(lerPerfil);
  const [modulo, setModulo] = useState(PERFIS[perfil].modulos[0]);
  const [trocou, setTrocou] = useState(false); // anima o modulo so quando o usuario troca de aba
  const [inicio, setInicio] = useState(false); // so a primeira chegada dos dados anima em sequencia

  const modulos = PERFIS[perfil].modulos;
  const ativo = modulos.includes(modulo) ? modulo : modulos[0];
  const Tela = TELAS[ativo];

  const trocarPerfil = (p) => {
    setPerfil(p);
    setTrocou(true);
    setModulo(PERFIS[p].modulos[0]);
    try { localStorage.setItem("perfil", p); } catch {}
  };

  useEffect(() => {
    if (movs === null) return;
    setInicio(true);
    const t = setTimeout(() => setInicio(false), 1600);
    return () => clearTimeout(t);
  }, [movs === null]);

  const precisaDados = ativo !== "insercao";

  return (
    <div className={"pagina" + (inicio ? " inicio" : "")}>
      <header className="topo">
        <div className="marca">
          <Logo />
          <div>
            <h1>Livro-caixa</h1>
            <p>Extrato OFX no seu banco de dados</p>
          </div>
        </div>
        <div className="topo-direita">
          <label className="perfil">
            Perfil
            <select value={perfil} onChange={(e) => trocarPerfil(e.target.value)}>
              {Object.entries(PERFIS).map(([id, p]) => <option key={id} value={id}>{p.nome}</option>)}
            </select>
          </label>
          <BotaoTema />
        </div>
      </header>

      {modulos.length > 1 && (
        <nav className="abas filtros" aria-label="Módulos" style={{ "--i": modulos.indexOf(ativo), "--n": modulos.length }}>
          {modulos.map((m) => (
            <button key={m} aria-pressed={m === ativo} onClick={() => { setTrocou(true); setModulo(m); }}>{MODULOS[m]}</button>
          ))}
        </nav>
      )}

      <p className={"aviso" + (aviso ? " ativo" : "")} role="status">{aviso || " "}</p>
      {erro && (
        <p className="erro">{erro} <button className="sec" onClick={() => { setErro(""); carregar(); }}>Tentar de novo</button></p>
      )}

      <main className={"modulo" + (trocou ? " troca" : "")} key={ativo}>
        {precisaDados && movs === null ? (
          !erro && <Esqueleto demora={demora} completo={ativo === "analise"} />
        ) : (
          <Tela extrato={extrato} />
        )}
      </main>
    </div>
  );
}
