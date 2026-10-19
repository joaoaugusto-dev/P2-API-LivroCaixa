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


def ler_ofx(arquivo):
    return OfxParser.parse(arquivo).account.statement.transactions


def conectar():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    with conn, conn.cursor() as cur:
        cur.execute(DDL)
    return conn


def salvar(transacoes):
    """Grava as transacoes e devolve quantas eram novas."""
    conn = conectar()
    # o "with conn" faz commit (ou rollback se der erro)
    with conn, conn.cursor() as cur:
        inseridas = 0
        for t in transacoes:
            cur.execute(INSERT, (t.date.date(), t.amount, t.memo, t.id))
            inseridas += cur.rowcount
    conn.close()
    return inseridas


def listar():
    conn = conectar()
    with conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, data_movimentacao, valor, descricao FROM movimentacoes "
            "ORDER BY data_movimentacao, id"
        )
        linhas = cur.fetchall()
    conn.close()
    return linhas


if __name__ == "__main__":
    with open("extrato.ofx", "rb") as arquivo:
        transacoes = ler_ofx(arquivo)
    inseridas = salvar(transacoes)
    print(f"{inseridas} inseridas, {len(transacoes) - inseridas} ignoradas (duplicadas)")
