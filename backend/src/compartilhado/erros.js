// Erro com código HTTP. Em qualquer ponto do código basta fazer:  throw new ErroHttp(404, "mensagem")
// e o tratarErros.js transforma em resposta JSON { erro: "mensagem" } com esse código.
export class ErroHttp extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;     // código HTTP (400, 401, 403, 404, 409...)
    this.detalhes = detalhes; // opcional: lista de campos com problema (validação)
  }
}

// Atalho para o 404 mais comum: naoEncontrado("Categoria") -> "Categoria não encontrada."
export const naoEncontrado = (o = "Registro") => new ErroHttp(404, `${o} não encontrada.`);
