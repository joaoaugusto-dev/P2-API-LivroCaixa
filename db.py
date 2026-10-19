import os

import psycopg2
from dotenv import load_dotenv
from ofxparse import OfxParser

load_dotenv()

# fitid e o identificador unico da transacao no OFX; o UNIQUE impede duplicatas
DDL = """
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    data_movimentacao DATE,
    valor NUMERIC(15,2),
    descricao VARCHAR(255),
    fitid VARCHAR(64) UNIQUE
);
"""

INSERT = """
INSERT INTO movimentacoes (data_movimentacao, valor, descricao, fitid)
VALUES (%s, %s, %s, %s)
ON CONFLICT (fitid) DO NOTHING
"""

with open("extrato.ofx", "rb") as arquivo:
    transacoes = OfxParser.parse(arquivo).account.statement.transactions

# o "with conn" faz commit (ou rollback se der erro)
conn = psycopg2.connect(os.environ["DATABASE_URL"])
with conn, conn.cursor() as cur:
    cur.execute(DDL)
    inseridas = 0
    for t in transacoes:
        cur.execute(INSERT, (t.date.date(), t.amount, t.memo, t.id))
        inseridas += cur.rowcount
conn.close()

print(f"{inseridas} inseridas, {len(transacoes) - inseridas} ignoradas (duplicadas)")
