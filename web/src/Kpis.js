// indicadores derivados das movimentacoes; tudo em reais (numeros), formatacao fica na tela
export function calcular(movs) {
  const ent = movs.filter((m) => m.valor > 0);
  const sai = movs.filter((m) => m.valor < 0);
  const entradas = ent.reduce((s, m) => s + m.valor, 0);
  const saidas = sai.reduce((s, m) => s + m.valor, 0);
  const dia = 86400000;
  const datas = movs.map((m) => new Date(m.data).getTime());
  const dias = movs.length ? Math.round((Math.max(...datas) - Math.min(...datas)) / dia) + 1 : 0;
  const maior = (l, f) => l.reduce((a, b) => (f(b, a) ? b : a), l[0]);
  return {
    entradas,
    saidas,
    saldo: entradas + saidas,
    qtdEntradas: ent.length,
    qtdSaidas: sai.length,
    comprometido: entradas ? -saidas / entradas : 0,
    maiorEntrada: ent.length ? maior(ent, (b, a) => b.valor > a.valor) : null,
    maiorSaida: sai.length ? maior(sai, (b, a) => b.valor < a.valor) : null,
    mediaSaida: sai.length ? -saidas / sai.length : 0,
    gastoPorDia: dias ? -saidas / dias : 0,
    dias,
    sobra: entradas ? (entradas + saidas) / entradas : null,
    diaMaisPesado: diaMaisPesado(sai),
    inicio: movs[0]?.data,
    fim: movs.at(-1)?.data,
  };
}

// dia com mais dinheiro saindo
function diaMaisPesado(saidas) {
  const porDia = {};
  for (const m of saidas) (porDia[m.data] ??= { data: m.data, valor: 0, n: 0 }, porDia[m.data].valor += m.valor, porDia[m.data].n++);
  return Object.values(porDia).reduce((a, b) => (!a || b.valor < a.valor ? b : a), null);
}

const DIA = 86400000;
const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const isoDe = (ms) => new Date(ms).toISOString().slice(0, 10);

// entradas e saidas por dia (ou por semana, se o periodo passa de 45 dias), sem buracos no meio
export function porPeriodo(movs) {
  if (!movs.length) return { semanal: false, itens: [] };
  const ini = utc(movs[0].data), fim = utc(movs.at(-1).data);
  const semanal = (fim - ini) / DIA > 45;
  const segunda = (ms) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DIA;
  const chave = (iso) => (semanal ? segunda(utc(iso)) : utc(iso));
  const itens = new Map();
  for (let t = chave(movs[0].data); t <= chave(movs.at(-1).data); t += semanal ? 7 * DIA : DIA)
    itens.set(t, { inicio: isoDe(t), entradas: 0, saidas: 0, n: 0 });
  for (const m of movs) {
    const i = itens.get(chave(m.data));
    i[m.valor > 0 ? "entradas" : "saidas"] += m.valor;
    i.n++;
  }
  return { semanal, itens: [...itens.values()] };
}

// as maiores entradas ou saidas, por valor absoluto
export function maiores(movs, tipo, n = 5) {
  return movs
    .filter((m) => (tipo === "entradas" ? m.valor > 0 : m.valor < 0))
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    .slice(0, n);
}
