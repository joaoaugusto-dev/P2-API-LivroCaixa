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

const lerPerfil = () => {
  try { return localStorage.getItem("perfil") in PERFIS ? localStorage.getItem("perfil") : "admin"; } catch { return "admin"; }
};

export default function App() {
  const extrato = useExtrato();
  const { movs, erro, setErro, aviso, carregar, demora } = extrato;
  const [perfil, setPerfil] = useState(lerPerfil);
  const [modulo, setModulo] = useState(PERFIS[perfil].modulos[0]);
  const [inicio, setInicio] = useState(false); // so a primeira chegada dos dados anima em sequencia

  const modulos = PERFIS[perfil].modulos;
  const ativo = modulos.includes(modulo) ? modulo : modulos[0];
  const Tela = TELAS[ativo];

  const trocarPerfil = (p) => {
    setPerfil(p);
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
        <label className="perfil">
          Perfil
          <select value={perfil} onChange={(e) => trocarPerfil(e.target.value)}>
            {Object.entries(PERFIS).map(([id, p]) => <option key={id} value={id}>{p.nome}</option>)}
          </select>
        </label>
      </header>

      {modulos.length > 1 && (
        <nav className="abas filtros" aria-label="Módulos" style={{ "--i": modulos.indexOf(ativo), "--n": modulos.length }}>
          {modulos.map((m) => (
            <button key={m} aria-pressed={m === ativo} onClick={() => setModulo(m)}>{MODULOS[m]}</button>
          ))}
        </nav>
      )}

      <p className={"aviso" + (aviso ? " ativo" : "")} role="status">{aviso || " "}</p>
      {erro && (
        <p className="erro">{erro} <button className="sec" onClick={() => { setErro(""); carregar(); }}>Tentar de novo</button></p>
      )}

      <main className="modulo" key={ativo}>
        {precisaDados && movs === null ? (
          !erro && <Esqueleto demora={demora} completo={ativo === "analise"} />
        ) : (
          <Tela extrato={extrato} />
        )}
      </main>
    </div>
  );
}
