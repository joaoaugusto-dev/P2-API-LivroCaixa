const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const moeda = (v) => brl.format(v);
export const dataCurta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
export const dataCompleta = (iso) => dataCurta(iso) + "/" + iso.slice(0, 4);
export const percentual = (v) => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

// "R$ 1.234,56" digitado como 123456: guarda so os centavos e formata a cada tecla
export const centavosDe = (texto) => Math.min(parseInt(texto.replace(/\D/g, "") || "0", 10), 1e12);
export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
