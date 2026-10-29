// TELA DE LOGIN: e-mail e senha. Quem entra vê só os módulos do seu perfil (o servidor também confere).
// À esquerda, um livro-caixa de exemplo se escreve sozinho (lançamentos entram, o saldo sobe e desce no gráfico em degraus).
import { useEffect, useRef, useState } from "react";
import { entrar } from "../api.js";
import { Girar, Logo } from "../componentes/Icones.jsx";
import { moeda } from "../format.js";
import useContagem from "../useContagem.js";

// Lançamentos de exemplo (não são dados reais). A soma é 0, então o saldo volta ao ponto de partida a cada volta.
const AMOSTRA = [
  { d: "Venda no balcão", v: 1850 }, { d: "Aluguel", v: -1200 }, { d: "Fornecedor", v: -430.9 }, { d: "Pix de cliente", v: 620 },
  { d: "Conta de luz", v: -312.45 }, { d: "Venda online", v: 940 }, { d: "Embalagens", v: -185.3 }, { d: "Mensalidades", v: 2100 }, { d: "Retirada", v: -3381.35 },
];
const BASE = 3000, VISIVEIS = 5, PONTOS = 9, LARGURA = 360;
// saldo depois do lançamento n (o lançamento n é o n-ésimo da fila infinita de exemplos)
const lancamento = (n) => AMOSTRA[((n % AMOSTRA.length) + AMOSTRA.length) % AMOSTRA.length];
const ACUMULADO = AMOSTRA.reduce((acc, l) => [...acc, (acc.at(-1) ?? 0) + l.v], []);
const saldoApos = (n) => BASE + ACUMULADO[((n % AMOSTRA.length) + AMOSTRA.length) % AMOSTRA.length];
const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gráfico de saldo em degraus: mesmo desenho do logo, com a bolinha dourada no saldo de agora
function Degraus({ ultimo }) {
  const pts = Array.from({ length: PONTOS }, (_, i) => 62 - ((saldoApos(ultimo - (PONTOS - 1) + i) - 2800) / 4000) * 54);
  const passo = LARGURA / (PONTOS - 1);
  const d = `M0,${pts[0]}` + pts.slice(1).map((y, i) => ` H${(i + 1) * passo} V${y}`).join("");
  return (
    <svg className="degraus" viewBox={`0 0 ${LARGURA} 70`} aria-hidden="true">
      <path d={d} style={{ d: `path("${d}")` }} pathLength="1" />
      <circle r="5" cx={LARGURA - 3} cy="0" style={{ transform: `translateY(${pts.at(-1)}px)` }} />
    </svg>
  );
}

// Olho animado: com a senha escondida o risco cobre o olho; ao mostrar, o risco se apaga, a pupila "acorda" e o olho pisca.
// A pupila segue o mouse pela tela inteira (escreve direto no elemento, sem re-renderizar a cada movimento).
function Olho({ visivel, piscando }) {
  const svg = useRef(), pupila = useRef();
  useEffect(() => {
    if (reduzMovimento()) return;
    let quadro;
    const seguir = (e) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        if (!svg.current) return;
        const r = svg.current.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const forca = Math.min(Math.hypot(dx, dy) / 160, 1); // perto do olho mexe pouco, longe vai até o canto
        const ang = Math.atan2(dy, dx);
        pupila.current.style.transform = `translate(${(Math.cos(ang) * forca * 3.6).toFixed(2)}px, ${(Math.sin(ang) * forca * 1.9).toFixed(2)}px)`;
      });
    };
    addEventListener("pointermove", seguir);
    return () => { removeEventListener("pointermove", seguir); cancelAnimationFrame(quadro); };
  }, []);
  return (
    <svg ref={svg} className={"olho" + (visivel ? " visivel" : "") + (piscando ? " piscando" : "")} viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g className="olho-corpo">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <g className="olho-olhar" ref={pupila}><circle className="olho-pupila" cx="12" cy="12" r="3" /></g>
      </g>
      <path className="olho-vao" d="M4 4 20 20" pathLength="1" />
      <path className="olho-barra" d="M4 4 20 20" pathLength="1" />
    </svg>
  );
}

// Recebe aoEntrar(usuario): função do App que troca a tela de login pelo painel.
export default function Login({ aoEntrar }) {
  // um estado para cada campo do formulário, mais a mensagem de erro e o "enviando" (desabilita o botão)
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false); // mostra/esconde a senha
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [piscando, setPiscando] = useState(false);
  const [caps, setCaps] = useState(false); // Caps Lock ligado enquanto digita a senha
  const campos = useRef(), campoSenha = useRef();
  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const alternarSenha = () => { setVer(!ver); setPiscando(true); setTimeout(() => setPiscando(false), 240); campoSenha.current.focus(); };
  const [saindo, setSaindo] = useState(false); // login ok: o formulário sai antes de o painel aparecer

  // Livro de exemplo: `ultimo` é o número do lançamento mais novo; a cada 2,8 s entra mais um
  const [ultimo, setUltimo] = useState(VISIVEIS - 1);
  const [inicio, setInicio] = useState(true); // só a primeira chegada escalona as linhas
  const [pausa, setPausa] = useState(false); // mouse em cima do livro: para de escrever para dar tempo de ler
  useEffect(() => { const t = setTimeout(() => setInicio(false), 1600); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (pausa || reduzMovimento()) return;
    const t = setInterval(() => setUltimo((n) => n + 1), 2800);
    return () => clearInterval(t);
  }, [pausa]);
  const saldo = useContagem(saldoApos(ultimo), 700);
  const linhas = Array.from({ length: VISIVEIS + 1 }, (_, p) => ultimo - p); // a mais nova no topo; a última sai de cena

  // Envia o formulário; se falhar, mostra a mensagem da API
  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      // entrar() (api.js) chama POST /api/auth/login e guarda os tokens; devolve os dados do usuário
      const usuario = await entrar(email, senha);
      setSaindo(true);
      setTimeout(() => aoEntrar(usuario), reduzMovimento() ? 0 : 380);
    } catch (err) {
      setErro(err.message); // ex.: "E-mail ou senha inválidos."
      setEnviando(false);
      setSenha("");
      campoSenha.current.focus();
      // os campos balançam (some se a pessoa pediu menos movimento)
      if (!reduzMovimento()) campos.current.animate([{ transform: "translateX(0)" }, { transform: "translateX(-9px)" }, { transform: "translateX(7px)" }, { transform: "translateX(-4px)" }, { transform: "translateX(0)" }], { duration: 400, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
  };

  return (
    <main className={"login" + (saindo ? " saindo" : "")}>
      <section className="livro" aria-label="Exemplo de livro-caixa" onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
        <div className="livro-topo"><Logo /><span>Livro-caixa</span></div>
        <h1>Entrou, saiu,<br />ficou registrado.</h1>
        <ul className="livro-linhas" aria-hidden="true">
          {linhas.map((n, p) => {
            const { d, v } = lancamento(n);
            return (
              <li key={n} className={v < 0 ? "l-sai" : "l-ent"} style={{ "--pos": p, "--atraso": inicio ? `${600 + p * 110}ms` : "0ms" }}>
                <span>{d}</span><b>{moeda(v)}</b>
              </li>
            );
          })}
        </ul>
        <div className="livro-saldo" aria-hidden="true">
          <small>Saldo de exemplo</small>
          <strong>{moeda(saldo)}</strong>
          <Degraus ultimo={ultimo} />
        </div>
      </section>

      <form className="login-form" onSubmit={enviar}>
        <h2>Entrar</h2>
        <p className="login-sub">Use o e-mail e a senha que você recebeu.</p>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div ref={campos}>
          <label>E-mail
            <span className="campo">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="voce@empresa.com" required autoFocus />
              <svg className={"campo-fim certo" + (emailOk ? " ativo" : "")} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1" /></svg>
            </span>
          </label>
          <label>Senha
            <span className="campo">
              <input ref={campoSenha} type={ver ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => setCaps(e.getModifierState("CapsLock"))} onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))} onBlur={() => setCaps(false)} autoComplete="current-password" required />
              <button type="button" className="campo-fim olho-botao" onClick={alternarSenha} aria-pressed={ver} aria-label={ver ? "Ocultar senha" : "Mostrar senha"} title={ver ? "Ocultar senha" : "Mostrar senha"}>
                <Olho visivel={ver} piscando={piscando} />
              </button>
            </span>
            <span className={"dica-caps" + (caps ? " ativo" : "")} role="status">{caps ? "Caps Lock está ligado." : ""}</span>
          </label>
        </div>
        <button className="botao" disabled={enviando}>{enviando ? <><Girar /> Entrando…</> : "Entrar"}</button>
        <p className="login-ajuda">Esqueceu a senha? Peça ao administrador para redefinir.</p>
      </form>
    </main>
  );
}
