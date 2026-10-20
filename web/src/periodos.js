// PERÍODOS: atalhos de datas (últimos 7 dias, este mês...) usados na Análise, na Administração e na Exportação.
// Data de hoje (ou de n dias atrás) no formato AAAA-MM-DD
export const iso = (d) => d.toISOString().slice(0, 10);
// data de n dias atrás (AAAA-MM-DD)
const dias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

// Atalhos de período: [id, rótulo, função que devolve {de, ate}]. "Personalizado" usa as datas escolhidas.
export const PERIODOS = [
  ["tudo", "Tudo", () => ({})],
  ["7", "Últimos 7 dias", () => ({ de: dias(7) })],
  ["30", "Últimos 30 dias", () => ({ de: dias(30) })],
  ["mes", "Este mês", () => ({ de: iso(new Date()).slice(0, 8) + "01" })],
  ["custom", "Personalizado", null],
];

// Converte o período escolhido em {de, ate} para filtrar
export const faixaDe = (periodo, de, ate) =>
  periodo === "custom" ? { de: de || undefined, ate: ate || undefined } : PERIODOS.find(([p]) => p === periodo)[2]();
