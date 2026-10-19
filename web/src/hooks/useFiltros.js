import { useMemo, useState } from "react";
import { faixaDe, PERIODOS } from "../periodos.js";
import { moeda, dataCompleta, dataCurta } from "../format.js";

const INICIAL = { busca: "", tipo: "todas", periodo: "tudo", de: "", ate: "", min: null, max: null, ordem: "data-asc" };

export const ORDENS = [
  ["data-asc", "Data: mais antigas"],
  ["data-desc", "Data: mais recentes"],
  ["valor-desc", "Valor: maior primeiro"],
  ["valor-asc", "Valor: menor primeiro"],
  ["desc-asc", "Descrição: A a Z"],
];

// sem acento e minusculo, para buscar "energia" em "ENERGIA ELÉTRICA"
export const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "luz -aluguel "folha pagamento"": todas as palavras precisam aparecer; -palavra exclui
export function termosDe(busca) {
  const incluir = [], excluir = [];
  for (const [, frase, palavra] of busca.matchAll(/"([^"]+)"|(\S+)/g)) {
    const t = sem(frase ?? palavra);
    if (!frase && t.length > 1 && t.startsWith("-")) excluir.push(t.slice(1));
    else incluir.push(t);
  }
  return { incluir, excluir };
}

// o que a busca enxerga de cada movimentacao: descricao, data e valor (como aparece na tela)
const textoDe = (m) =>
  sem(`${m.descricao} ${dataCompleta(m.data)} ${moeda(m.valor)} ${Math.abs(m.valor).toFixed(2).replace(".", ",")}`.replace(/ /g, " "));

const ordenar = (lista, ordem) => {
  const c = {
    "data-asc": (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
    "data-desc": (a, b) => b.data.localeCompare(a.data) || b.id - a.id,
    "valor-desc": (a, b) => b.valor - a.valor,
    "valor-asc": (a, b) => a.valor - b.valor,
    "desc-asc": (a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"),
  }[ordem];
  return lista.slice().sort(c);
};

export default function useFiltros(movs) {
  const [f, setF] = useState(INICIAL);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const limpar = () => setF(INICIAL);

  const termos = useMemo(() => termosDe(f.busca), [f.busca]);
  const faixa = faixaDe(f.periodo, f.de, f.ate);

  // em ordem cronologica (o grafico e os indicadores dependem disso)
  const cronologicas = useMemo(
    () =>
      movs.filter((m) => {
        const abs = Math.abs(m.valor);
        const texto = textoDe(m);
        return (
          (f.tipo === "todas" || (m.valor > 0) === (f.tipo === "entradas")) &&
          (!faixa.de || m.data >= faixa.de) && (!faixa.ate || m.data <= faixa.ate) &&
          (f.min == null || abs >= f.min / 100) && (f.max == null || abs <= f.max / 100) &&
          termos.incluir.every((t) => texto.includes(t)) && !termos.excluir.some((t) => texto.includes(t))
        );
      }),
    [movs, f.tipo, f.min, f.max, termos, faixa.de, faixa.ate]
  );
  const ordenadas = useMemo(() => ordenar(cronologicas, f.ordem), [cronologicas, f.ordem]);

  // filtros ligados, cada um com o que fazer para desliga-lo (vira "chip" na tela)
  const ativos = [
    f.busca.trim() && { id: "busca", rotulo: `Busca: ${f.busca.trim()}`, remover: () => set("busca", "") },
    f.tipo !== "todas" && { id: "tipo", rotulo: f.tipo === "entradas" ? "Só entradas" : "Só saídas", remover: () => set("tipo", "todas") },
    f.periodo !== "tudo" && {
      id: "periodo",
      rotulo: f.periodo === "custom"
        ? `Período: ${f.de ? dataCurta(f.de) : "início"} a ${f.ate ? dataCurta(f.ate) : "hoje"}`
        : PERIODOS.find(([p]) => p === f.periodo)[1],
      remover: () => setF((s) => ({ ...s, periodo: "tudo", de: "", ate: "" })),
    },
    (f.min != null || f.max != null) && {
      id: "valor",
      rotulo: `Valor: ${f.min != null ? moeda(f.min / 100) : "qualquer"} a ${f.max != null ? moeda(f.max / 100) : "qualquer"}`,
      remover: () => setF((s) => ({ ...s, min: null, max: null })),
    },
  ].filter(Boolean);

  const avancados = ativos.filter((a) => a.id === "periodo" || a.id === "valor").length;
  const invertido = (faixa.de && faixa.ate && faixa.de > faixa.ate) || (f.min != null && f.max != null && f.min > f.max);

  return { f, set, limpar, termos, cronologicas, ordenadas, ativos, avancados, invertido };
}
