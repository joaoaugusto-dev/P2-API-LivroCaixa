// CLASSIFICADOR AUTOMÁTICO DE CATEGORIAS (aprendizado simples, sem bibliotecas).
//
// Em uma frase: aprende QUAIS PALAVRAS da descrição aparecem em cada categoria (Naive Bayes) e escolhe a
// categoria mais provável para uma movimentação nova. Aprende de duas fontes:
//   1) SEMENTES: palavras iniciais de cada categoria padrão (funciona desde o primeiro dia);
//   2) EXEMPLOS: movimentações que a pessoa categorizou à mão (peso 3x: quem manda é o usuário).
// As classificações automáticas NÃO entram no treino, para o sistema não "se convencer sozinho" de um erro.

export const LIMIAR = 0.6;     // confiança mínima para aplicar sozinho (abaixo disso fica sem categoria)
const ALFA = 0.05;             // suavização: palavra nunca vista numa categoria pesa pouco a favor dela
export const PESO_SEMENTE = 1;
export const PESO_MANUAL = 3;

// nome -> [palavras-semente, sinal esperado]. O sinal vira uma palavra especial, assim "pagamento" de
// cliente (entrada) não se confunde com "folha pagamento" (saída).
const PADRAO = {
  "Clientes e receitas": ["recebimento pagamento cliente contrato projeto pix venda consultoria faturamento", "entrada"],
  "Aluguel e condomínio": ["aluguel condominio iptu locacao", "saida"],
  "Contas e serviços": ["energia eletrica agua internet telefone assinatura cloud storage luz gas", "saida"],
  "Pessoal": ["folha salario ferias decimo beneficios vale pagamento", "saida"],
  "Materiais": ["material limpeza escritorio papelaria suprimentos", "saida"],
  "Tecnologia": ["equipamento ti software notebook computador hardware licenca", "saida"],
  "Veículo e transporte": ["veiculo estacionamento combustivel manutencao pedagio uber gasolina", "saida"],
  "Impostos e taxas": ["imposto taxa tarifa iss simples darf das", "saida"],
};

const semAcento = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Descrição + sinal -> palavras normalizadas (sem acento, singular simples, sem números)
export function palavras(descricao, valor) {
  const saida = [];
  for (let p of semAcento(descricao).match(/[a-z]+/g) ?? []) {
    if (p.length > 3 && p.endsWith("s")) p = p.slice(0, -1); // "equipamentos" -> "equipamento"
    if (p.length >= 2) saida.push(p);
  }
  saida.push(valor > 0 ? "_entrada" : "_saida");
  return saida;
}

// Palavras-semente de uma categoria padrão (vazio se foi criada pela pessoa)
export function sementes(nomeCategoria) {
  const padrao = PADRAO[nomeCategoria];
  if (!padrao) return [];
  const [texto, sinal] = padrao;
  return texto.split(" ").map((p) => palavras(p, sinal === "entrada" ? 1 : -1));
}

// exemplos: [[categoriaId, [palavras], peso]]. Devolve o "modelo" = contagens por categoria.
export function treinar(exemplos) {
  const contagem = new Map(), total = new Map(), prior = new Map(), vocab = new Set();
  for (const [cat, ps, peso] of exemplos) {
    const c = contagem.get(cat) ?? contagem.set(cat, new Map()).get(cat);
    for (const p of ps) {
      c.set(p, (c.get(p) ?? 0) + peso);
      total.set(cat, (total.get(cat) ?? 0) + peso);
      vocab.add(p);
    }
    prior.set(cat, (prior.get(cat) ?? 0) + peso);
  }
  return { contagem, total, prior, vocab };
}

// Devolve [categoriaId, confiança 0..1] ou null se não reconhece nenhuma palavra
export function prever(modelo, ps) {
  const { contagem, total, prior, vocab } = modelo;
  if (!ps.some((p) => vocab.has(p) && !p.startsWith("_"))) return null; // melhor não chutar
  const somaPrior = [...prior.values()].reduce((a, b) => a + b, 0);
  const logs = new Map();
  for (const [cat, c] of contagem) {
    let lp = Math.log(prior.get(cat) / somaPrior);
    const denom = total.get(cat) + ALFA * vocab.size;
    for (const p of ps) if (vocab.has(p)) lp += Math.log(((c.get(p) ?? 0) + ALFA) / denom);
    logs.set(cat, lp);
  }
  // softmax: transforma os logs em probabilidades que somam 1 (a maior é a "confiança")
  const maior = Math.max(...logs.values());
  const exps = new Map([...logs].map(([cat, v]) => [cat, Math.exp(v - maior)]));
  const soma = [...exps.values()].reduce((a, b) => a + b, 0);
  const [melhor, valor] = [...exps].reduce((a, b) => (b[1] > a[1] ? b : a));
  return [melhor, valor / soma];
}
