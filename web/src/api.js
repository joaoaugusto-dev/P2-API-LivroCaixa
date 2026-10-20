// CAMADA DE API: tudo o que o front-end pede ao servidor Python passa por aqui.
// Converte a resposta em JSON; se o servidor respondeu erro, rejeita (a tela mostra "Tentar de novo")
const json = (r) => (r.ok ? r.json() : Promise.reject());

// Uma função por rota da API; os componentes nunca escrevem fetch direto
export const listar = () => fetch("/api/movimentacoes").then(json);
// Criar (POST) ou editar (PUT, quando há id)
export const salvar = (corpo, id) =>
  fetch("/api/movimentacoes" + (id ? "/" + id : ""), { method: id ? "PUT" : "POST", body: JSON.stringify(corpo) });
export const excluir = (id) => fetch("/api/movimentacoes/" + id, { method: "DELETE" });
export const importar = (arquivo) => fetch("/api/importar", { method: "POST", body: arquivo });
// Rota de download (usada como link, não como fetch)
// CATEGORIAS: listar, criar, editar, excluir e pedir que o sistema reaprenda e reclassifique
export const categorias = () => fetch("/api/categorias").then(json);
const corpo = (metodo, dados) => ({ method: metodo, body: JSON.stringify(dados) });
export const criarCategoria = (c) => fetch("/api/categorias", corpo("POST", c));
export const editarCategoria = (id, c) => fetch("/api/categorias/" + id, corpo("PUT", c));
export const excluirCategoria = (id) => fetch("/api/categorias/" + id, { method: "DELETE" });
export const reclassificar = () => fetch("/api/categorias/reclassificar", { method: "POST" });
// A pessoa escolheu (ou confirmou) a categoria de uma movimentação: o servidor aprende com isso
export const definirCategoria = (id, categoria_id) => fetch(`/api/movimentacoes/${id}/categoria`, corpo("PUT", { categoria_id }));

export const URL_EXPORTAR = "/api/exportar";
