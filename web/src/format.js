// FORMATAÇÃO: funções pequenas para mostrar dinheiro, datas, porcentagens e plurais em português.
// Formata números como moeda brasileira: 1234.5 -> "R$ 1.234,50"
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const moeda = (v) => brl.format(v);
// "2026-10-05" -> "05/10" e "05/10/2026"
export const dataCurta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
export const dataCompleta = (iso) => dataCurta(iso) + "/" + iso.slice(0, 4);
// 0.339 -> "33,9%"
export const percentual = (v) => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

// Máscara de dinheiro: guarda só os dígitos digitados como centavos (123456 -> R$ 1.234,56)
export const centavosDe = (texto) => Math.min(parseInt(texto.replace(/\D/g, "") || "0", 10), 1e12);
// Singular/plural: plural(1, "saída", "saídas") -> "1 saída"
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
