// controle segmentado com indicador deslizante (estilo em .filtros)
export default function Segmentos({ opcoes, valor, onChange, rotulo }) {
  return (
    <div className="filtros" role="group" aria-label={rotulo} style={{ "--i": opcoes.findIndex(([v]) => v === valor), "--n": opcoes.length }}>
      {opcoes.map(([v, nome]) => <button type="button" key={v} aria-pressed={v === valor} onClick={() => onChange(v)}>{nome}</button>)}
    </div>
  );
}
