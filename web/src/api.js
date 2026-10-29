// CAMADA DE API: tudo o que o front-end pede ao servidor Node passa por aqui.
// Guarda a sessão (tokens), manda o token em cada chamada e, se ele expirar (401), renova sozinho e repete.
// Se a API respondeu erro, rejeita com a mensagem dela (a tela mostra "Tentar de novo").

const CHAVE = "livro-caixa-sessao";

// SESSÃO: tokens no localStorage (fica só neste navegador; some se a pessoa clicar em Sair)
export const sessao = {
  ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || null; } catch { return null; } },
  salvar(dados) { try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch {} },
  limpar() { try { localStorage.removeItem(CHAVE); } catch {} },
};

// O App é avisado quando a sessão acaba de vez (volta para a tela de login)
let aoExpirar = () => {};
export const definirAoExpirar = (fn) => { aoExpirar = fn; };

// Várias chamadas que falham juntas renovam o token uma vez só
let renovando = null;
function renovarToken() {
  const refreshToken = sessao.ler()?.refreshToken;
  if (!refreshToken) return Promise.reject();
  renovando ??= fetch("/api/auth/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) })
    .then(async (r) => { if (!r.ok) throw new Error(); sessao.salvar(await r.json()); })
    .finally(() => { renovando = null; });
  return renovando;
}

// fetch com o token no cabeçalho. Se der 401, renova o token e tenta de novo (uma vez só).
async function requisitar(url, opcoes = {}, tentarRenovar = true) {
  const token = sessao.ler()?.accessToken;
  const r = await fetch(url, { ...opcoes, headers: { ...opcoes.headers, ...(token && { Authorization: `Bearer ${token}` }) } });
  if (r.status !== 401 || !tentarRenovar || !token) return r;
  try { await renovarToken(); } catch { sessao.limpar(); aoExpirar(); return r; }
  return requisitar(url, opcoes, false);
}

const json = (r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(d.erro), () => Promise.reject()));

// LOGIN / LOGOUT
export async function entrar(email, senha) {
  const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, senha }) });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || "Não consegui falar com a API.");
  sessao.salvar(dados);
  return dados.usuario;
}
export async function sair() {
  const refreshToken = sessao.ler()?.refreshToken;
  sessao.limpar();
  if (refreshToken) await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) }).catch(() => {});
}

// Troca a senha de quem está logado. O servidor derruba todas as sessões, então entramos de novo para ter tokens novos.
export async function trocarSenha(email, senhaAtual, senhaNova) {
  const r = await requisitar("/api/auth/trocar-senha", corpo("POST", { senhaAtual, senhaNova }));
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || "Não consegui trocar a senha.");
  await entrar(email, senhaNova);
}

// Monta as opções de um fetch com corpo JSON
const corpo = (metodo, dados) => ({ method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });

// Uma função por rota da API; os componentes nunca escrevem fetch direto
export const listar = () => requisitar("/api/movimentacoes").then(json);
// Criar (POST) ou editar (PUT, quando há id)
export const salvar = (dados, id) => requisitar("/api/movimentacoes" + (id ? "/" + id : ""), corpo(id ? "PUT" : "POST", dados));
// Excluir uma movimentação
export const excluir = (id) => requisitar("/api/movimentacoes/" + id, { method: "DELETE" });
// Importar um arquivo .ofx (vai como formulário, no campo "arquivo")
export const importar = (arquivo) => {
  const form = new FormData();
  form.append("arquivo", arquivo);
  return requisitar("/api/importacao", { method: "POST", body: form });
};

// CATEGORIAS: listar, criar, editar, excluir e pedir que o sistema reaprenda e reclassifique
export const categorias = () => requisitar("/api/categorias").then(json);
export const criarCategoria = (c) => requisitar("/api/categorias", corpo("POST", c));
export const editarCategoria = (id, c) => requisitar("/api/categorias/" + id, corpo("PUT", c));
export const excluirCategoria = (id) => requisitar("/api/categorias/" + id, { method: "DELETE" });
export const reclassificar = () => requisitar("/api/categorias/reclassificar", { method: "POST" });
// A pessoa escolheu (ou confirmou) a categoria de uma movimentação: o servidor aprende com isso
export const definirCategoria = (id, categoria_id) => requisitar(`/api/movimentacoes/${id}/categoria`, corpo("PUT", { categoria_id }));

// Baixa o arquivo exportado (precisa do token, então não dá para ser um link simples)
export async function baixar(parametros, formato) {
  const r = await requisitar("/api/exportacao?" + new URLSearchParams({ ...parametros, formato }));
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || "Não consegui baixar o arquivo.");
  const nome = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition"))?.[1] ?? "extrato." + formato;
  const url = URL.createObjectURL(await r.blob());
  Object.assign(document.createElement("a"), { href: url, download: nome }).click();
  URL.revokeObjectURL(url);
}
