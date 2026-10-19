// Perfis so organizam a tela (quem ve qual modulo). Nao ha login: nao e controle de acesso de verdade.
export const MODULOS = {
  analise: "Análise",
  insercao: "Inserção",
  exportacao: "Exportação",
  administracao: "Administração",
};

export const PERFIS = {
  admin: { nome: "Administrador geral", modulos: ["analise", "insercao", "exportacao", "administracao"] },
  analise: { nome: "Análise", modulos: ["analise"] },
  insercao: { nome: "Inserção", modulos: ["insercao"] },
  exportacao: { nome: "Exportação", modulos: ["exportacao"] },
};
