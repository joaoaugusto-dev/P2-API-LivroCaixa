// APLICAÇÃO PRINCIPAL: casca da página. Escolhe o perfil, mostra as abas e renderiza o módulo ativo.
import { useEffect, useState } from "react";
import useExtrato from "./hooks/useExtrato.js";
import Esqueleto from "./componentes/Esqueleto.jsx";
import { Logo } from "./componentes/Icones.jsx";
import { MODULOS, PERFIS } from "./perfis.js";
import Analise from "./modulos/Analise.jsx";
import Insercao from "./modulos/Insercao.jsx";
import Exportacao from "./modulos/Exportacao.jsx";
import Administracao from "./modulos/Administracao.jsx";
import Categorias from "./modulos/Categorias.jsx";

// Cada módulo (aba) aponta para o componente que desenha a tela dele
const TELAS = { analise: Analise, insercao: Insercao, exportacao: Exportacao, administracao: Administracao, categorias: Categorias };

// Botão sol/lua: troca o tema claro/escuro, salva a escolha e anima a troca
function BotaoTema() {
  const [tema, setTema] = useState(document.documentElement.dataset.tema);
  // Ao clicar: troca o tema, guarda a escolha e anima
  const alternar = (e) => {
    // 1) decide o próximo tema e grava no <html> (o CSS usa data-tema para trocar as cores)
    const novo = tema === "escuro" ? "claro" : "escuro";
    const aplicar = () => { document.documentElement.dataset.tema = novo; setTema(novo); };
    try { localStorage.setItem("tema", novo); } catch {}
    // 2) sem animação se a pessoa pediu "reduzir movimento"
    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return aplicar();
    // 3) navegador antigo: só suaviza as cores por 0,4 s
    if (!document.startViewTransition) {
      const html = document.documentElement;
      html.classList.add("tema-troca");
      aplicar();
      return setTimeout(() => html.classList.remove("tema-troca"), 450);
    }
    // 4) navegador moderno: o tema novo se revela em círculo a partir do botão clicado (View Transitions)
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

// Lê o último perfil escolhido (salvo no navegador); se não houver, começa como Administrador
const lerPerfil = () => {
  try { return localStorage.getItem("perfil") in PERFIS ? localStorage.getItem("perfil") : "admin"; } catch { return "admin"; }
};

// Componente raiz: topo (logo, perfil, tema), abas, avisos e o módulo ativo
export default function App() {
  // todos os dados e operações vêm deste hook e são repassados aos módulos
  const extrato = useExtrato();
  const { movs, erro, setErro, aviso, carregar, demora } = extrato;
  const [perfil, setPerfil] = useState(lerPerfil);
  const [modulo, setModulo] = useState(PERFIS[perfil].modulos[0]);
  const [trocou, setTrocou] = useState(false); // anima o modulo so quando o usuario troca de aba
  const [inicio, setInicio] = useState(false); // so a primeira chegada dos dados anima em sequencia

  // quais abas o perfil enxerga e qual está aberta
  const modulos = PERFIS[perfil].modulos;
  const ativo = modulos.includes(modulo) ? modulo : modulos[0];
  const Tela = TELAS[ativo];

  // trocar de perfil recarrega as abas permitidas e abre a primeira
  const trocarPerfil = (p) => {
    setPerfil(p);
    setTrocou(true);
    setModulo(PERFIS[p].modulos[0]);
    try { localStorage.setItem("perfil", p); } catch {}
  };

  // liga a animação de entrada só por 1,6 s depois que os dados chegam pela 1ª vez
  useEffect(() => {
    if (movs === null) return;
    setInicio(true);
    const t = setTimeout(() => setInicio(false), 1600);
    return () => clearTimeout(t);
  }, [movs === null]);

  // só a Inserção funciona sem a lista carregada (as outras mostram o esqueleto enquanto carrega)
  const precisaDados = ativo !== "insercao";

  return (
    <div className={"pagina" + (inicio ? " inicio" : "")}>
      {/* TOPO: logo, seletor de perfil e botão de tema */}
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

      {/* ABAS: só aparecem se o perfil tem mais de um módulo */}
      {modulos.length > 1 && (
        <nav className="abas filtros" aria-label="Módulos" style={{ "--i": modulos.indexOf(ativo), "--n": modulos.length, "--c": modulos.indexOf(ativo) % 2, "--r": Math.floor(modulos.indexOf(ativo) / 2), "--linhas": Math.ceil(modulos.length / 2) }}>
          {modulos.map((m) => (
            <button key={m} aria-pressed={m === ativo} onClick={() => { setTrocou(true); setModulo(m); }}>{MODULOS[m]}</button>
          ))}
        </nav>
      )}

      {/* AVISOS: confirmações ("Movimentação adicionada") e erros de conexão com botão para tentar de novo */}
      <p className={"aviso" + (aviso ? " ativo" : "")} role="status">{aviso || " "}</p>
      {erro && (
        <p className="erro">{erro} <button className="sec" onClick={() => { setErro(""); carregar(); }}>Tentar de novo</button></p>
      )}

      {/* MÓDULO ATIVO: esqueleto de carregamento ou a tela escolhida */}
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
