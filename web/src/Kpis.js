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
    inicio: movs[0]?.data,
    fim: movs.at(-1)?.data,
  };
}
