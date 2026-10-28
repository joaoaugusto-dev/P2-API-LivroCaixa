// Mostra no console cada chamada à API: hora, método, rota, código HTTP e o que aconteceu.
// Em caso de erro (4xx/5xx), a descrição é o motivo que a API devolveu. Nunca registra corpo, senha ou token.

// "MÉTODO rota-do-express" -> o que aquela chamada faz quando dá certo
const ACOES = {
  "POST /api/auth/login": "Login realizado",
  "POST /api/auth/refresh": "Sessão renovada",
  "POST /api/auth/logout": "Logout realizado",
  "GET /api/auth/eu": "Dados do usuário logado consultados",
  "POST /api/auth/trocar-senha": "Senha alterada",
  "GET /api/saude": "API no ar",
  "GET /api/movimentacoes/": "Movimentações listadas",
  "POST /api/movimentacoes/": "Movimentação criada",
  "PUT /api/movimentacoes/:id": "Movimentação editada",
  "DELETE /api/movimentacoes/:id": "Movimentação excluída",
  "PUT /api/movimentacoes/:id/categoria": "Categoria da movimentação definida (o sistema aprendeu)",
  "GET /api/categorias/": "Categorias listadas",
  "POST /api/categorias/": "Categoria criada",
  "PUT /api/categorias/:id": "Categoria editada",
  "DELETE /api/categorias/:id": "Categoria excluída (movimentações reclassificadas)",
  "POST /api/categorias/reclassificar": "Classificador retreinado e movimentações reclassificadas",
  "POST /api/importacao/": "Arquivo OFX importado",
  "GET /api/exportacao/": "Extrato exportado",
};

const COR = (status) => (status >= 500 ? 31 : status >= 400 ? 33 : 32); // vermelho, amarelo, verde
const pintar = (status, texto) => (process.stdout.isTTY ? `\x1b[${COR(status)}m${texto}\x1b[0m` : texto);

export function registrar(req, res, next) {
  if (process.env.NODE_ENV === "test") return next();
  const inicio = Date.now();
  let motivo = "";
  // guarda a mensagem de erro que a API devolve em JSON ({ erro })
  const json = res.json.bind(res);
  res.json = (corpo) => { motivo = corpo?.erro ?? ""; return json(corpo); };

  res.on("finish", () => {
    const rota = req.method + " " + req.baseUrl + (req.route?.path ?? "");
    const descricao = res.statusCode >= 400 ? motivo || "Erro" : ACOES[rota] ?? "Requisição concluída";
    const quem = req.usuario ? ` [${req.usuario.perfil}]` : "";
    const linha = `${new Date().toLocaleTimeString("pt-BR")}  ${req.method.padEnd(6)} ${req.originalUrl.split("?")[0]}  ${res.statusCode}  ${descricao}${quem}  (${Date.now() - inicio} ms)`;
    console.log(pintar(res.statusCode, linha));
  });
  next();
}
