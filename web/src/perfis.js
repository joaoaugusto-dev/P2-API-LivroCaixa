// PERFIS E MÓDULOS. Atenção: os perfis só organizam a tela. Não há login, então não é controle de acesso de verdade.
// Nomes dos módulos (abas) da interface
export const MODULOS = {
  analise: "Análise",
  insercao: "Inserção",
  exportacao: "Exportação",
  administracao: "Administração",
  categorias: "Categorias",
};

// Cada perfil define quais módulos aparecem. O Administrador geral vê todos.
export const PERFIS = {
  admin: { nome: "Administrador geral", modulos: ["analise", "insercao", "exportacao", "administracao", "categorias"] },
  analise: { nome: "Análise", modulos: ["analise"] },
  // quem insere dados também revisa as categorias das movimentações novas
  insercao: { nome: "Inserção", modulos: ["insercao", "categorias"] },
  exportacao: { nome: "Exportação", modulos: ["exportacao"] },
};
