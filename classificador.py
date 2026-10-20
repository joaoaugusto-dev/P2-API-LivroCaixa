"""CLASSIFICADOR AUTOMÁTICO DE CATEGORIAS (aprendizado de máquina simples, sem bibliotecas).

Como funciona, em uma frase: ele aprende QUAIS PALAVRAS da descrição aparecem em cada categoria
(Naive Bayes) e escolhe a categoria mais provável para uma movimentação nova.

Aprende de duas fontes:
  1) SEMENTES: palavras iniciais de cada categoria padrão (para funcionar desde o primeiro dia);
  2) EXEMPLOS: movimentações que a pessoa categorizou à mão (peso 3x maior: o usuário manda).
As classificações automáticas NÃO entram no treino, para o sistema não "se convencer sozinho" de um erro.
"""
import math
import re
import unicodedata

LIMIAR = 0.6        # confiança mínima para aplicar a categoria sozinho (abaixo disso, deixa sem categoria)
ALFA = 0.05         # suavização pequena: palavra nunca vista numa categoria pesa pouco a favor dela
PESO_SEMENTE = 1    # cada palavra-semente vale 1 exemplo
PESO_MANUAL = 3     # cada exemplo categorizado à mão vale 3

# Categorias criadas na primeira execução: nome -> (cor 1..8, palavras-semente, sinal esperado)
# O sinal ("entrada"/"saida") vira uma palavra especial, assim "pagamento" de cliente (entrada)
# não se confunde com "folha pagamento" (saída).
PADRAO = {
    "Clientes e receitas": (3, "recebimento pagamento cliente contrato projeto pix venda consultoria faturamento", "entrada"),
    "Aluguel e condomínio": (1, "aluguel condominio iptu locacao", "saida"),
    "Contas e serviços": (2, "energia eletrica agua internet telefone assinatura cloud storage luz gas", "saida"),
    "Pessoal": (5, "folha salario ferias decimo beneficios vale pagamento", "saida"),
    "Materiais": (4, "material limpeza escritorio papelaria suprimentos", "saida"),
    "Tecnologia": (7, "equipamento ti software notebook computador hardware licenca", "saida"),
    "Veículo e transporte": (8, "veiculo estacionamento combustivel manutencao pedagio uber gasolina", "saida"),
    "Impostos e taxas": (6, "imposto taxa tarifa iss simples darf das", "saida"),
}


# Tira acentos e deixa minúsculo ("Energia Elétrica" -> "energia eletrica")
def _sem_acento(texto):
    return unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode().lower()


def palavras(descricao, valor):
    """Descrição + sinal -> lista de palavras normalizadas (sem acento, singular simples, sem números)."""
    saida = []
    for p in re.findall(r"[a-z]+", _sem_acento(descricao)):
        if len(p) > 3 and p.endswith("s"):  # "equipamentos" -> "equipamento"
            p = p[:-1]
        if len(p) >= 2:
            saida.append(p)
    saida.append("_entrada" if valor > 0 else "_saida")
    return saida


def sementes(nome_categoria):
    """Palavras-semente de uma categoria padrão (vazio se for uma categoria criada pela pessoa)."""
    if nome_categoria not in PADRAO:
        return []
    _, texto, sinal = PADRAO[nome_categoria]
    return [palavras(p, 1 if sinal == "entrada" else -1) for p in texto.split()]


def treinar(exemplos):
    """exemplos: lista de (categoria_id, [palavras], peso). Devolve o 'modelo' = contagens por categoria."""
    contagem, total, peso_cat, vocab = {}, {}, {}, set()
    for cat, ps, peso in exemplos:
        c = contagem.setdefault(cat, {})
        for p in ps:
            c[p] = c.get(p, 0) + peso
            total[cat] = total.get(cat, 0) + peso
            vocab.add(p)
        peso_cat[cat] = peso_cat.get(cat, 0) + peso
    return {"contagem": contagem, "total": total, "prior": peso_cat, "vocab": vocab}


def prever(modelo, ps):
    """Devolve (categoria_id, confiança 0..1, palavras que pesaram) ou None se não reconhece nada."""
    contagem, vocab = modelo["contagem"], modelo["vocab"]
    conhecidas = [p for p in ps if p in vocab and not p.startswith("_")]
    if not contagem or not conhecidas:
        return None  # nenhuma palavra da descrição foi vista no treino: melhor não chutar
    soma_prior = sum(modelo["prior"].values())
    logs = {}
    for cat, c in contagem.items():
        lp = math.log(modelo["prior"][cat] / soma_prior)
        denom = modelo["total"][cat] + ALFA * len(vocab)
        for p in ps:
            if p in vocab:
                lp += math.log((c.get(p, 0) + ALFA) / denom)
        logs[cat] = lp
    # softmax: transforma os logs em probabilidades que somam 1 (a maior é a "confiança")
    maior = max(logs.values())
    exps = {cat: math.exp(v - maior) for cat, v in logs.items()}
    s = sum(exps.values())
    melhor = max(exps, key=exps.get)
    motivo = [p for p in conhecidas if contagem[melhor].get(p, 0) > 0][:3]
    return melhor, exps[melhor] / s, motivo
