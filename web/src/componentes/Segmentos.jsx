// Botões lado a lado em que só um fica ativo (ex.: Todas | Entradas | Saídas).
// A pílula que desliza é desenhada pelo CSS usando as variáveis --i (posição) e --n (quantidade).
// `opcoes` = lista de [valor, rótulo].
export default function Segmentos({ opcoes, valor, onChange, rotulo }) {
  return (
    <div className="filtros" role="group" aria-label={rotulo} style={{ "--i": opcoes.findIndex(([v]) => v === valor), "--n": opcoes.length }}>
      {opcoes.map(([v, nome]) => <button type="button" key={v} aria-pressed={v === valor} onClick={() => onChange(v)}>{nome}</button>)}
    </div>
  );
}
