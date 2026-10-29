// POP-UP "Trocar senha": pede a senha atual e a nova (duas vezes) e chama POST /api/auth/trocar-senha.
import { forwardRef, useState } from "react";
import { trocarSenha } from "../api.js";
import { Girar } from "../componentes/Icones.jsx";

const vazio = { atual: "", nova: "", repete: "" };

const TrocarSenha = forwardRef(function TrocarSenha({ email }, ref) {
  const [campos, setCampos] = useState(vazio);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (e) => setCampos((c) => ({ ...c, [campo]: e.target.value }));

  const fechar = () => { ref.current.close(); setCampos(vazio); setErro(""); setOk(false); };

  const enviar = async (e) => {
    e.preventDefault();
    if (campos.nova !== campos.repete) return setErro("A confirmação não bate com a nova senha.");
    setErro("");
    setEnviando(true);
    try {
      await trocarSenha(email, campos.atual, campos.nova);
      setOk(true);
      setTimeout(fechar, 1400);
    } catch (err) {
      setErro(err.message); // ex.: "A senha atual está incorreta."
    }
    setEnviando(false);
  };

  return (
    <dialog ref={ref} onClose={() => { setCampos(vazio); setErro(""); setOk(false); }}>
      <form onSubmit={enviar}>
        <h2>Trocar senha</h2>
        {ok ? <p className="ok" role="status">Senha alterada. Os outros aparelhos precisarão entrar de novo.</p> : (
          <>
            {erro && <p className="erro" role="alert">{erro}</p>}
            <label>Senha atual<input type="password" value={campos.atual} onChange={mudar("atual")} autoComplete="current-password" required autoFocus /></label>
            <label>Nova senha<input type="password" value={campos.nova} onChange={mudar("nova")} autoComplete="new-password" minLength={8} maxLength={72} required /></label>
            <label>Repita a nova senha<input type="password" value={campos.repete} onChange={mudar("repete")} autoComplete="new-password" minLength={8} maxLength={72} required /></label>
            <p className="nota">De 8 a 72 caracteres.</p>
            <div className="botoes-form">
              <button type="button" className="sec" onClick={fechar}>Cancelar</button>
              <button type="submit" disabled={enviando}>{enviando ? <Girar /> : "Salvar"}</button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
});
export default TrocarSenha;
