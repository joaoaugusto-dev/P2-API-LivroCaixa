"""DESAFIO EXTRA: camada de banco (PostgreSQL no Neon). Lê o OFX, grava sem duplicar, lista, edita,
exclui e exporta. É o único arquivo que fala com o banco; a API (api.py) só chama as funções daqui."""
import os
import uuid
from datetime import date

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv
from ofxparse import OfxParser

load_dotenv()  # carrega DATABASE_URL do arquivo .env (que fica fora do git)

# ── SQL ─────────────────────────────────────────────────────────────────────
# Tabela do enunciado + `fitid`: o id único de cada transação no OFX. O UNIQUE é o que impede duplicatas.
DDL = """
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    data_movimentacao DATE,
    valor NUMERIC(15,2),
    descricao VARCHAR(255),
    fitid VARCHAR(64) UNIQUE
);
"""

# Se o fitid já existe, ignora a linha em vez de dar erro (validação de duplicatas)
INSERT = """
INSERT INTO movimentacoes (data_movimentacao, valor, descricao, fitid)
VALUES (%s, %s, %s, %s)
ON CONFLICT (fitid) DO NOTHING
"""


def ler_ofx(arquivo):
    """Transforma um arquivo OFX na lista de transações."""
    return OfxParser.parse(arquivo).account.statement.transactions


# ── Conexão ─────────────────────────────────────────────────────────────────
# Abrir conexão nova com o Neon custa ~1s (TLS + login). Por isso: um pool reaproveitado
# e a criação da tabela uma única vez.
_pool = None
_pronto = []  # vira [True] depois que a tabela foi garantida


def _rodar(fn):
    """Executa fn(cursor) dentro de uma transação. Se a conexão do pool caiu, tenta mais uma vez."""
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(1, 5, os.environ["DATABASE_URL"])
    for tentativa in (1, 2):
        conn = _pool.getconn()
        quebrou = False
        try:
            if not _pronto:  # garante a tabela só na primeira vez
                with conn, conn.cursor() as cur:
                    cur.execute(DDL)
                _pronto.append(True)
            with conn, conn.cursor() as cur:  # o "with conn" faz commit (ou rollback se der erro)
                return fn(cur)
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            quebrou = True
            if tentativa == 2:
                raise
        finally:
            _pool.putconn(conn, close=quebrou)  # devolve ao pool (descarta se quebrou)


# ── Leitura e gravação ──────────────────────────────────────────────────────
def salvar(transacoes):
    """Grava as transações do OFX e devolve quantas eram novas (as repetidas são ignoradas)."""
    def gravar(cur):
        inseridas = 0
        for t in transacoes:
            cur.execute(INSERT, (t.date.date(), t.amount, t.memo, t.id))
            inseridas += cur.rowcount  # 1 se inseriu, 0 se já existia
        return inseridas
    return _rodar(gravar)


def listar():
    """Todas as movimentações, da mais antiga para a mais nova."""
    def consultar(cur):
        cur.execute(
            "SELECT id, data_movimentacao, valor, descricao, fitid FROM movimentacoes "
            "ORDER BY data_movimentacao, id"
        )
        return cur.fetchall()
    return _rodar(consultar)


# ── Exportação ──────────────────────────────────────────────────────────────
def exportar_ofx(linhas):
    """Monta um arquivo OFX (SGML, como os bancos exportam) a partir de listar().
    Mantém o fitid de cada linha, então dá para reimportar sem duplicar."""
    esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")  # texto seguro no OFX
    datas = [l[1] for l in linhas]
    ini, fim = (min(datas), max(datas)) if datas else (date.today(),) * 2
    # um bloco <STMTTRN> por movimentação
    trans = "".join(
        f"<STMTTRN>\n<TRNTYPE>{'CREDIT' if v > 0 else 'DEBIT'}\n<DTPOSTED>{d:%Y%m%d}000000\n"
        f"<TRNAMT>{v:.2f}\n<FITID>{fitid}\n<MEMO>{esc(desc)}\n</STMTTRN>\n"
        for _, d, v, desc, fitid in linhas
    )
    saldo = sum(l[2] for l in linhas)
    # cabeçalho + conta + lista de transações + saldo final
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


# ── CRUD (criar, editar, excluir) ───────────────────────────────────────────
def _executar(sql, params):
    """Roda um comando e devolve quantas linhas ele afetou."""
    return _rodar(lambda cur: (cur.execute(sql, params), cur.rowcount)[1])


def criar(data, valor, descricao):
    # lançamento manual não vem do OFX, então ganha um fitid próprio (manual-<código aleatório>)
    return _executar(INSERT, (data, valor, descricao, "manual-" + uuid.uuid4().hex))


def atualizar(id, data, valor, descricao):
    return _executar(
        "UPDATE movimentacoes SET data_movimentacao=%s, valor=%s, descricao=%s WHERE id=%s",
        (data, valor, descricao, id),
    )


def excluir(id):
    return _executar("DELETE FROM movimentacoes WHERE id=%s", (id,))


# Rodando `python db.py` grava o extrato.ofx no banco e diz quantas eram novas
if __name__ == "__main__":
    with open("extrato.ofx", "rb") as arquivo:
        transacoes = ler_ofx(arquivo)
    inseridas = salvar(transacoes)
    print(f"{inseridas} inseridas, {len(transacoes) - inseridas} ignoradas (duplicadas)")
