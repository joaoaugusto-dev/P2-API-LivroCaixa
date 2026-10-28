// TELA DE LOGIN: e-mail e senha. Quem entra vê só os módulos do seu perfil (o servidor também confere).
import { useState } from "react";
import { entrar } from "../api.js";
import { Logo } from "../componentes/Icones.jsx";

// Recebe aoEntrar(usuario): função do App que troca a tela de login pelo painel.
export default function Login({ aoEntrar }) {
  // um estado para cada campo do formulário, mais a mensagem de erro e o "enviando" (desabilita o botão)
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Envia o formulário; se falhar, mostra a mensagem da API
  const enviar = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      // entrar() (api.js) chama POST /api/auth/login e guarda os tokens; devolve os dados do usuário
      aoEntrar(await entrar(email, senha));
    } catch (err) {
      setErro(err.message); // ex.: "E-mail ou senha inválidos."
      setEnviando(false);
    }
  };

  return (
    <div className="pagina login">
      <form className="painel" onSubmit={enviar}>
        <div className="marca"><Logo /><div><h1>Livro-caixa</h1><p>Entre para continuar</p></div></div>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus /></label>
        <label>Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required /></label>
        <button className="botao" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
