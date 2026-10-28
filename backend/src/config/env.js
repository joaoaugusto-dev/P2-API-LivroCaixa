// Carrega o .env da raiz do projeto e entrega as variáveis já validadas num objeto só.
// Falta de configuração derruba o servidor na partida, com mensagem clara (nunca em plena requisição).
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(raiz, ".env") });

// Nos testes automáticos não exigimos banco nem segredo
const testando = process.env.NODE_ENV === "test";

if (!process.env.DATABASE_URL && !testando) {
  throw new Error("DATABASE_URL não definida: copie .env.example para .env e preencha com a sua connection string.");
}
if ((process.env.JWT_SEGREDO || "").length < 32 && !testando) {
  throw new Error("Defina JWT_SEGREDO (mínimo 32 caracteres) no .env. Gere um com: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
}

// URL sem host ("postgresql:///banco") = Postgres local por socket Unix, como o psql e o psycopg2 entendem.
// O pg precisa que o diretório do socket seja informado.
function comSocket(url) {
  return url && /^postgres(ql)?:\/\/\//.test(url) && !/[?&]host=/.test(url)
    ? url + (url.includes("?") ? "&" : "?") + "host=/var/run/postgresql"
    : url;
}

// Objeto único com toda a configuração; o resto do código importa daqui (nunca lê process.env direto)
export const env = {
  producao: process.env.NODE_ENV === "production",
  porta: Number(process.env.PORT || 3333),
  corsOrigens: (process.env.CORS_ORIGENS || "http://localhost:5173").split(",").map((o) => o.trim()),
  bancoUrl: comSocket(process.env.DATABASE_URL),
  jwt: {
    segredo: process.env.JWT_SEGREDO || "segredo-so-para-testes-0123456789abcdef",
    expiraEm: process.env.JWT_EXPIRA_EM || "15m",
    refreshDias: Number(process.env.REFRESH_EXPIRA_DIAS || 7),
  },
  seedSenha: process.env.SEED_SENHA,
};
