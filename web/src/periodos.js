export const iso = (d) => d.toISOString().slice(0, 10);
const dias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

// atalhos de periodo, compartilhados por Analise, Administracao e Exportacao
export const PERIODOS = [
  ["tudo", "Tudo", () => ({})],
  ["7", "Últimos 7 dias", () => ({ de: dias(7) })],
  ["30", "Últimos 30 dias", () => ({ de: dias(30) })],
  ["mes", "Este mês", () => ({ de: iso(new Date()).slice(0, 8) + "01" })],
  ["custom", "Personalizado", null],
];

export const faixaDe = (periodo, de, ate) =>
  periodo === "custom" ? { de: de || undefined, ate: ate || undefined } : PERIODOS.find(([p]) => p === periodo)[2]();
