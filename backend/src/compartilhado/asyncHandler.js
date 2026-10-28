// O Express 4 não captura sozinho erros de funções async (com await).
// Este "embrulho" pega qualquer erro e o repassa ao tratarErros.js, que responde em JSON.
// Por isso os controladores não precisam de try/catch.
export const assincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
