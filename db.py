import os
import uuid
from datetime import date

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
            "SELECT id, data_movimentacao, valor, descricao, fitid FROM movimentacoes "
            "ORDER BY data_movimentacao, id"
        )
        linhas = cur.fetchall()
    conn.close()
    return linhas


def exportar_ofx(linhas):
    """Monta um OFX (SGML, como os bancos exportam) a partir de listar(); da pra reimportar."""
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    datas = [l[1] for l in linhas]
    ini, fim = (min(datas), max(datas)) if datas else (date.today(),) * 2
    trans = "".join(
        f"<STMTTRN>\n<TRNTYPE>{'CREDIT' if v > 0 else 'DEBIT'}\n<DTPOSTED>{d:%Y%m%d}000000\n"
        f"<TRNAMT>{v:.2f}\n<FITID>{fitid}\n<MEMO>{esc(desc)}\n</STMTTRN>\n"
        for _, d, v, desc, fitid in linhas
    )
    saldo = sum(l[2] for l in linhas)
    return (
        "OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\n"
        "CHARSET:1252\nCOMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n"
        f"<OFX>\n<SIGNONMSGSRSV1>\n<SONRS>\n<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>\n"
        f"<DTSERVER>{date.today():%Y%m%d}000000\n<LANGUAGE>POR\n</SONRS>\n</SIGNONMSGSRSV1>\n"
        "<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>1\n<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>\n"
        "<STMTRS>\n<CURDEF>BRL\n<BANKACCTFROM>\n<BANKID>000\n<ACCTID>exportado\n<ACCTTYPE>CHECKING\n"
        f"</BANKACCTFROM>\n<BANKTRANLIST>\n<DTSTART>{ini:%Y%m%d}000000\n<DTEND>{fim:%Y%m%d}000000\n"
        f"{trans}</BANKTRANLIST>\n<LEDGERBAL>\n<BALAMT>{saldo:.2f}\n<DTASOF>{fim:%Y%m%d}000000\n"
        "</LEDGERBAL>\n</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>\n"
    )


def _executar(sql, params):
    conn = conectar()
    with conn, conn.cursor() as cur:
        cur.execute(sql, params)
        resultado = cur.rowcount
    conn.close()
    return resultado


def criar(data, valor, descricao):
    # lancamento manual nao vem do OFX, entao ganha um fitid proprio
    return _executar(INSERT, (data, valor, descricao, "manual-" + uuid.uuid4().hex))


def atualizar(id, data, valor, descricao):
    return _executar(
        "UPDATE movimentacoes SET data_movimentacao=%s, valor=%s, descricao=%s WHERE id=%s",
        (data, valor, descricao, id),
    )


def excluir(id):
    return _executar("DELETE FROM movimentacoes WHERE id=%s", (id,))


if __name__ == "__main__":
    with open("extrato.ofx", "rb") as arquivo:
        transacoes = ler_ofx(arquivo)
    inseridas = salvar(transacoes)
    print(f"{inseridas} inseridas, {len(transacoes) - inseridas} ignoradas (duplicadas)")
