// Valida params, query e body com schemas do zod. Passou: troca pelo valor convertido ("12" vira 12).
// Falhou: 400 com a primeira mensagem em "erro" (a tela mostra) e a lista completa em "detalhes".
import { ErroHttp } from "../erros.js";

export const validar = (schemas) => (req, res, next) => {
  for (const parte of ["params", "query", "body"]) {
    if (!schemas[parte]) continue;
    const r = schemas[parte].safeParse(req[parte] ?? {});
    if (!r.success) {
      const detalhes = r.error.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message }));
      return next(new ErroHttp(400, detalhes[0].mensagem, detalhes));
    }
    // defineProperty: req.query pode ser só leitura dependendo da versão do Express
    Object.defineProperty(req, parte, { value: r.data, writable: true, configurable: true });
  }
  next();
};
