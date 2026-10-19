const json = (r) => (r.ok ? r.json() : Promise.reject());

export const listar = () => fetch("/api/movimentacoes").then(json);
export const salvar = (corpo, id) =>
  fetch("/api/movimentacoes" + (id ? "/" + id : ""), { method: id ? "PUT" : "POST", body: JSON.stringify(corpo) });
export const excluir = (id) => fetch("/api/movimentacoes/" + id, { method: "DELETE" });
export const importar = (arquivo) => fetch("/api/importar", { method: "POST", body: arquivo });
export const URL_EXPORTAR = "/api/exportar";
