// COMPONENTES DE CATEGORIA: bolinha de cor, seletor de cor e o "chip" clicável que troca/confirma a categoria.
import { useEffect, useRef, useState } from "react";
import { Icone } from "./Icones.jsx";
import { sem } from "../hooks/useFiltros.js";

// A cor da categoria é um número de 1 a 8 que aponta para uma variável do CSS (muda sozinha no tema escuro)
export const corDe = (n) => (n ? `var(--cat-${n})` : "var(--borda-forte)");

const check = <path d="M20 6 9 17l-5-5" pathLength="1" />; // pathLength=1 deixa o traço animável (desenha o ✓)

// Bolinha colorida ao lado do nome da categoria
export function Ponto({ cor }) {
  return <span className="cat-ponto" style={{ "--cat": corDe(cor) }} aria-hidden="true" />;
}

// Seletor das 8 cores (usado ao criar ou editar uma categoria)
export function Cores({ valor, onChange }) {
  return (
    <div className="cores" role="radiogroup" aria-label="Cor da categoria">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
        <button type="button" role="radio" key={n} className="cor" aria-checked={valor === n} aria-label={`Cor ${n}`} style={{ "--cat": corDe(n) }} onClick={() => onChange(n)} />
      ))}
    </div>
  );
}

// Mostra a categoria de uma movimentação. Se receber `onEscolher`, o clique abre um menu com busca para
// trocar, remover ou CRIAR uma categoria na hora. Sugestões automáticas ganham "auto" e um ✓ para confirmar.
// `confirmando` = a confirmação desta linha está animando; `onConfirmar(mov)` = clique no ✓ (anima e depois grava).
export function ChipCategoria({ mov, categorias, onEscolher, onCriar, onConfirmar, confirmando }) {
  const cat = categorias.find((c) => c.id === mov.categoria_id);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const raiz = useRef();

  // fecha o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e) => !raiz.current?.contains(e.target) && setAberto(false);
    const esc = (e) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const rotulo = cat ? <><Ponto cor={cat.cor} />{cat.nome}</> : "Sem categoria";
  const certeza = mov.auto && mov.confianca ? Math.round(mov.confianca * 100) : null;

  // somente leitura (Análise): só mostra
  if (!onEscolher) return <span className={"chip-cat" + (cat ? "" : " vazia")} title={certeza ? `Sugerida automaticamente (${certeza}% de certeza)` : undefined}>{rotulo}{mov.auto && <span className="auto-marca">auto</span>}</span>;

  // escolhe uma categoria (ou null para remover): fecha o menu e avisa quem usa o chip
  const escolher = (id) => { setAberto(false); setBusca(""); setErro(""); onEscolher(id); };
  const filtradas = categorias.filter((c) => sem(c.nome).includes(sem(busca)));
  const existe = categorias.some((c) => sem(c.nome) === sem(busca.trim()));
  // cria a categoria digitada na busca e já a atribui à movimentação
  const criar = async () => {
    const r = await onCriar(busca.trim());
    if (r?.erro) return setErro(r.erro);
    setAberto(false); setBusca(""); setErro("");
  };

  return (
    <span className="chip-wrap" ref={raiz}>
      <button
        type="button"
        className={"chip-cat" + (cat ? "" : " vazia") + (mov.auto ? " auto" : "")}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title={certeza ? `Sugerida automaticamente (${certeza}% de certeza). Confirme ou troque.` : "Trocar categoria"}
        onClick={() => setAberto(!aberto)}
      >
        {rotulo}
        {mov.auto && <span className={"auto-marca" + (confirmando ? " some" : "")}>auto</span>}
      </button>
      {/* ✓ confirma a sugestão com um clique: ela vira exemplo para o sistema aprender */}
      {mov.auto && cat && (
        <button
          type="button"
          className={"confirmar-cat" + (confirmando ? " confirmado" : "")}
          aria-label={`Confirmar categoria ${cat.nome}`}
          title="Confirmar (o sistema aprende com isso)"
          disabled={confirmando}
          onClick={() => (onConfirmar ? onConfirmar(mov) : escolher(cat.id))}
        >
          <Icone d={check} />
        </button>
      )}
      {aberto && (
        <div className="menu-cat" role="listbox">
          <input
            autoFocus
            type="search"
            value={busca}
            placeholder="Buscar ou criar categoria"
            aria-label="Buscar ou criar categoria"
            onChange={(e) => { setBusca(e.target.value); setErro(""); }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (filtradas[0] && (existe || !busca.trim())) escolher(filtradas[0].id);
              else if (busca.trim() && !existe) criar();
            }}
          />
          <ul>
            {filtradas.map((c) => (
              <li key={c.id}>
                <button type="button" role="option" aria-selected={c.id === mov.categoria_id} onClick={() => escolher(c.id)}>
                  <Ponto cor={c.cor} />{c.nome}
                  {c.id === mov.categoria_id && <Icone d={check} />}
                </button>
              </li>
            ))}
            {busca.trim() && !existe && onCriar && (
              <li><button type="button" className="criar-cat" onClick={criar}>+ Criar "{busca.trim()}"</button></li>
            )}
            {cat && <li><button type="button" className="remover-cat" onClick={() => escolher(null)}>Remover categoria</button></li>}
          </ul>
          {erro && <p className="erro-menu">{erro}</p>}
        </div>
      )}
    </span>
  );
}
