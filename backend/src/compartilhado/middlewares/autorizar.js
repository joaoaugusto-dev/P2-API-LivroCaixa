// AUTORIZAÇÃO: descobre se quem chamou PODE fazer isso. Vem depois do autenticar. Sem permissão = 403.
// Uso:  router.get("/x", autorizar("analise:ler"), handler)
import { temPermissao } from "../../config/permissoes.js";
import { ErroHttp } from "../erros.js";

export const autorizar = (...permissoes) => (req, res, next) => {
  if (!req.usuario) return next(new ErroHttp(401, "Faça login para continuar."));
  if (!permissoes.every((p) => temPermissao(req.usuario.perfil, p))) {
    return next(new ErroHttp(403, "Seu perfil não tem permissão para esta ação."));
  }
  next();
};
