from ofxparse import OfxParser

with open("extrato.ofx", "rb") as arquivo:
    ofx = OfxParser.parse(arquivo)

for transacao in ofx.account.statement.transactions:
    print(
        transacao.date.strftime("%Y-%m-%d"),
        transacao.amount,
        transacao.memo
    )
