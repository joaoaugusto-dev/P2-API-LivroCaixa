// AUTORIZAÇÃO: o que cada perfil pode fazer. As rotas pedem uma permissão (autorizar("analise:ler")),
// nunca um perfil direto: mudar o acesso de um perfil é editar só este arquivo.
// Os perfis são os mesmos que a interface já tinha (web/src/perfis.js).

export const PERFIS = {
  ADMIN: "ADMIN",           // administrador geral: tudo
  ANALISE: "ANALISE",       // só consulta (análise e gráficos)
  INSERCAO: "INSERCAO",     // lança, importa e revisa categorias
  EXPORTACAO: "EXPORTACAO", // baixa os arquivos
};

const { ADMIN, ANALISE, INSERCAO, EXPORTACAO } = PERFIS;

// Para cada permissão, a lista de perfis que a têm. É a única fonte da verdade do acesso.
// Formato "recurso:ação". Quem não está na lista recebe 403.
export const PERMISSOES = {
  "movimentacoes:ler": [ADMIN, ANALISE, INSERCAO, EXPORTACAO],
  "movimentacoes:criar": [ADMIN, INSERCAO],
  "movimentacoes:editar": [ADMIN],
  "movimentacoes:apagar": [ADMIN],
  "movimentacoes:categorizar": [ADMIN, INSERCAO],
  "categorias:ler": [ADMIN, ANALISE, INSERCAO, EXPORTACAO],
  "categorias:gerenciar": [ADMIN, INSERCAO],
  "importacao:criar": [ADMIN, INSERCAO],
  "relatorios:exportar": [ADMIN, EXPORTACAO],
};

// O perfil tem esta permissão?
export const temPermissao = (perfil, permissao) => PERMISSOES[permissao]?.includes(perfil) ?? false;

// Todas as permissões de um perfil (enviadas ao front-end no login)
export const permissoesDoPerfil = (perfil) => Object.keys(PERMISSOES).filter((p) => temPermissao(perfil, p));
