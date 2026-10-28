// Deixa o banco pronto do zero, com dados limpos (nenhuma movimentação):
//   1) cria as tabelas (se não existem), 2) as 8 categorias padrão, 3) um usuário de cada perfil.
// Pode rodar várias vezes: nada é apagado nem duplicado. A senha vem de SEED_SENHA no .env.   npm run db:seed
import bcrypt from "bcryptjs";
import { env } from "../src/config/env.js";
import { pool } from "../src/compartilhado/db.js";

if (env.producao) {
  console.error("Seed bloqueado em produção: ele cria usuários com senha conhecida.");
  process.exit(1);
}
if (!env.seedSenha || env.seedSenha.length < 8) {
  console.error("Defina SEED_SENHA (mínimo 8 caracteres) no .env.");
  process.exit(1);
}

// Tabelas. `fitid` (id da transação no OFX) é UNIQUE: impede importar o mesmo extrato duas vezes.
// `categoria_auto` = true quando o classificador escolheu e ninguém confirmou; `categoria_confianca` = quão seguro ele estava.
// As palavras-semente de cada categoria padrão ficam em modulos/categorias/classificador.js.
const TABELAS = `
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(160) NOT NULL,
    senha_hash  VARCHAR(100) NOT NULL,
    perfil      VARCHAR(20)  NOT NULL CHECK (perfil IN ('ADMIN', 'ANALISE', 'INSERCAO', 'EXPORTACAO')),
    ativo       BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuarios_email ON usuarios (lower(email));

-- Guardamos só o hash do refresh token, nunca o token em si.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER     NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
    token_hash  CHAR(64)    NOT NULL UNIQUE,
    expira_em   TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_usuario ON refresh_tokens (usuario_id);

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(40) UNIQUE NOT NULL,
    cor SMALLINT NOT NULL DEFAULT 1   -- número (1 a 8) de uma cor da paleta do front-end
);

CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    data_movimentacao DATE,
    valor NUMERIC(15,2),
    descricao VARCHAR(255),
    fitid VARCHAR(64) UNIQUE
);
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL;
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS categoria_auto BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE movimentacoes ADD COLUMN IF NOT EXISTS categoria_confianca REAL;

INSERT INTO categorias (nome, cor) VALUES
    ('Clientes e receitas', 3), ('Aluguel e condomínio', 1), ('Contas e serviços', 2), ('Pessoal', 5),
    ('Materiais', 4), ('Tecnologia', 7), ('Veículo e transporte', 8), ('Impostos e taxas', 6)
ON CONFLICT (nome) DO NOTHING;
`;

// Um usuário por perfil. O perfil define o que a pessoa pode fazer (config/permissoes.js).
const USUARIOS = [
  { nome: "Administrador", email: "admin@livrocaixa.com", perfil: "ADMIN" },
  { nome: "Análise", email: "analise@livrocaixa.com", perfil: "ANALISE" },
  { nome: "Inserção", email: "insercao@livrocaixa.com", perfil: "INSERCAO" },
  { nome: "Exportação", email: "exportacao@livrocaixa.com", perfil: "EXPORTACAO" },
];

try {
  await pool.query(TABELAS);
  console.log("✔ tabelas e categorias padrão");
  // bcrypt guarda só o "hash" da senha (não dá para desfazer); 10 = custo do cálculo
  const hash = await bcrypt.hash(env.seedSenha, 10);
  for (const u of USUARIOS) {
    // ON CONFLICT DO NOTHING: se o e-mail já existe, não faz nada (por isso o seed pode rodar várias vezes)
    const { rowCount } = await pool.query(
      "INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
      [u.nome, u.email, hash, u.perfil]
    );
    console.log(`${rowCount ? "✔ criado " : "• já existe"}  ${u.email}  (${u.perfil})`);
  }
  console.log("A senha é a SEED_SENHA do seu .env.");
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
