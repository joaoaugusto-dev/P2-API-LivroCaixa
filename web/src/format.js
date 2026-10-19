const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const moeda = (v) => brl.format(v);
export const dataCurta = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
export const dataCompleta = (iso) => dataCurta(iso) + "/" + iso.slice(0, 4);
