"""ATIVIDADE BÁSICA: lê o extrato OFX e mostra as movimentações, as entradas, as saídas e o saldo."""
from ofxparse import OfxParser

# 1) Abre o arquivo em modo binário e deixa a biblioteca ofxparse transformar o OFX em objetos
with open("extrato.ofx", "rb") as arquivo:
    ofx = OfxParser.parse(arquivo)

transacoes = ofx.account.statement.transactions  # lista de movimentações da conta
entradas = 0
saidas = 0

print("EXTRATO BANCÁRIO")
print("-" * 40)

# 2) Percorre cada movimentação, mostra os dados e já acumula os totais
for t in transacoes:
    print(f"""
Data      : {t.date.strftime('%d/%m/%Y')}
Valor     : R$ {t.amount:.2f}
Descrição : {t.memo}
{'-' * 40}""")
    if t.amount > 0:      # valor positivo = dinheiro que entrou
        entradas += t.amount
    else:                 # valor negativo = dinheiro que saiu
        saidas += t.amount

# 3) Saldo = entradas + saídas (as saídas já são negativas)
saldo = entradas + saidas

print(f"Total de movimentações: {len(transacoes)}")
print(f"Entradas: R$ {entradas:.2f}")
print(f"Saídas  : R$ {saidas:.2f}")
print(f"Saldo   : R$ {saldo:.2f}")
