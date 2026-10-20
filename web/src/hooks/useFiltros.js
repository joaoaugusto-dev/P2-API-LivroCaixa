// BUSCA E FILTROS da Análise e da Administração: busca sem acento, tipo, período, faixa de valor e ordenação.
import { useMemo, useState } from "react";
import { faixaDe, PERIODOS } from "../periodos.js";
import { moeda, dataCompleta, dataCurta } from "../format.js";

// Estado inicial dos filtros (= nenhum filtro ligado)
const INICIAL = { busca: "", tipo: "todas", periodo: "tudo", de: "", ate: "", min: null, max: null, categoria: "todas", ordem: "data-asc" };

// Opções do seletor "Ordenar por"
export const ORDENS = [
  ["data-asc", "Data: mais antigas"],
  ["data-desc", "Data: mais recentes"],
  ["valor-desc", "Valor: maior primeiro"],
  ["valor-asc", "Valor: menor primeiro"],
  ["desc-asc", "Descrição: A a Z"],
];

// Tira acentos e deixa minúsculo, para "energia" achar "ENERGIA ELÉTRICA"
export const sem = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Interpreta o texto da busca: palavras soltas (todas precisam aparecer), -palavra (exclui) e "frase entre aspas"
export function termosDe(busca) {
  // palavras que devem aparecer e palavras que não podem aparecer
  const incluir = [], excluir = [];
  for (const [, frase, palavra] of busca.matchAll(/"([^"]+)"|(\S+)/g)) {
    const t = sem(frase ?? palavra);
    if (!frase && t.length > 1 && t.startsWith("-")) excluir.push(t.slice(1));
    else incluir.push(t);
  }
  return { incluir, excluir };
}

// O texto em que a busca procura: descrição + data + valor, do jeito que aparecem na tela
const textoDe = (m) =>
  sem(`${m.descricao} ${dataCompleta(m.data)} ${moeda(m.valor)} ${Math.abs(m.valor).toFixed(2).replace(".", ",")}`.replace(/ /g, " "));

// Ordena a lista conforme a opção escolhida (devolve uma cópia, não altera a original)
const ordenar = (lista, ordem) => {
  // uma função de comparação para cada opção de ordenação
  const c = {
    "data-asc": (a, b) => a.data.localeCompare(b.data) || a.id - b.id,
    "data-desc": (a, b) => b.data.localeCompare(a.data) || b.id - a.id,
    "valor-desc": (a, b) => b.valor - a.valor,
    "valor-asc": (a, b) => a.valor - b.valor,
    "desc-asc": (a, b) => a.descricao.localeCompare(b.descricao, "pt-BR"),
  }[ordem];
  return lista.slice().sort(c);
};

// HOOK DE BUSCA E FILTROS: recebe todas as movimentações e devolve o recorte filtrado.
// Quem usa (Análise e Administração) só desenha o resultado.
export default function useFiltros(movs, categorias = []) {
  const [f, setF] = useState(INICIAL);
  // set("tipo", "saidas") atualiza um filtro; limpar() volta tudo ao inicial
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  // volta todos os filtros ao estado inicial
  const limpar = () => setF(INICIAL);

  // só recalcula quando algo muda (useMemo): termos da busca e período em datas
  const termos = useMemo(() => termosDe(f.busca), [f.busca]);
  const faixa = faixaDe(f.periodo, f.de, f.ate);

  // APLICA os filtros (tipo, período, faixa de valor e busca). Fica em ordem de data porque o gráfico e os KPIs dependem disso.
  const cronologicas = useMemo(
    () =>
      movs.filter((m) => {
        const abs = Math.abs(m.valor);
        const texto = textoDe(m);
        return (
          (f.tipo === "todas" || (m.valor > 0) === (f.tipo === "entradas")) &&
          (!faixa.de || m.data >= faixa.de) && (!faixa.ate || m.data <= faixa.ate) &&
          (f.min == null || abs >= f.min / 100) && (f.max == null || abs <= f.max / 100) &&
          (f.categoria === "todas" || (f.categoria === "sem" ? m.categoria_id == null : m.categoria_id === f.categoria)) &&
          termos.incluir.every((t) => texto.includes(t)) && !termos.excluir.some((t) => texto.includes(t))
        );
      }),
    [movs, f.tipo, f.min, f.max, f.categoria, termos, faixa.de, faixa.ate]
  );
  // a tabela mostra a mesma lista, na ordem escolhida pela pessoa
  const ordenadas = useMemo(() => ordenar(cronologicas, f.ordem), [cronologicas, f.ordem]);

  // Lista dos filtros ligados; cada um sabe se remover (vira um "chip" com × na tela)
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
    f.categoria !== "todas" && {
      id: "categoria",
      rotulo: `Categoria: ${f.categoria === "sem" ? "sem categoria" : categorias.find((c) => c.id === f.categoria)?.nome ?? "?"}`,
      remover: () => set("categoria", "todas"),
    },
  ].filter(Boolean);

  // quantos filtros do painel "Filtros" estão ligados (número no botão) e se algum intervalo está invertido
  const avancados = ativos.filter((a) => ["periodo", "valor", "categoria"].includes(a.id)).length;
  // true se o início do período (ou do valor) é maior que o fim
  const invertido = (faixa.de && faixa.ate && faixa.de > faixa.ate) || (f.min != null && f.max != null && f.min > f.max);

  return { f, set, limpar, termos, cronologicas, ordenadas, ativos, avancados, invertido };
}
