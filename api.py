"""API HTTP mínima (só biblioteca padrão do Python). É a ponte entre a interface React (web/) e o banco (db.py)."""
import io
import json
from datetime import date
from decimal import Decimal
from urllib.parse import parse_qs, urlsplit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import db
import planilha


# Texto do cabeçalho da planilha Excel, ex.: "Extrato de 05/10/2026 a 12/10/2026, só saídas"
def descricao_do_filtro(de, ate, tipo):
    periodo = f"{de:%d/%m/%Y} a {ate:%d/%m/%Y}" if de and ate else f"a partir de {de:%d/%m/%Y}" if de else f"até {ate:%d/%m/%Y}" if ate else "todo o período"
    return f"Extrato de {periodo}" + {"todas": "", "entradas": ", só entradas", "saidas": ", só saídas"}[tipo]


# Um "handler" por requisição: cada método do_XXX trata um verbo HTTP (GET, POST, PUT, DELETE)
class Handler(BaseHTTPRequestHandler):
    # Resposta padrão em JSON (a interface React sempre recebe JSON, exceto nos downloads)
    def responder(self, dados, status=200):
        corpo = json.dumps(dados, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    # Validação na entrada: só aceita data ISO, valor numérico e descrição de até 255 caracteres
    def corpo_json(self):
        """Valida o JSON de criar/editar; devolve (data, valor, descricao) ou None."""
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            data, valor, desc = date.fromisoformat(d["data"]), Decimal(str(d["valor"])), str(d["descricao"]).strip()
            assert desc and len(desc) <= 255 and valor.is_finite()
            return data, valor, desc
        except Exception:
            self.responder({"erro": "Informe data, valor e descricao validos"}, 400)

    # Pega o número do final de /api/movimentacoes/<id>; se não for número, responde 404
    def id_da_url(self):
        prefixo = "/api/movimentacoes/"
        if self.path.startswith(prefixo) and self.path[len(prefixo):].isdigit():
            return int(self.path[len(prefixo):])
        self.responder({"erro": "nao encontrado"}, 404)

    # GET /api/exportar: filtra por período e tipo e devolve o arquivo (OFX ou Excel) para download
    def exportar(self, q):
        """?de=AAAA-MM-DD&ate=AAAA-MM-DD&tipo=entradas|saidas (todos opcionais)"""
        try:
            de = date.fromisoformat(q["de"][0]) if "de" in q else None
            ate = date.fromisoformat(q["ate"][0]) if "ate" in q else None
        except ValueError:
            return self.responder({"erro": "Periodo invalido"}, 400)
        tipo = q.get("tipo", ["todas"])[0]
        if tipo not in ("todas", "entradas", "saidas"):
            return self.responder({"erro": "Tipo invalido"}, 400)
        linhas = [
            l for l in db.listar()
            if (not de or l[1] >= de) and (not ate or l[1] <= ate)
            and (tipo == "todas" or (l[2] > 0) == (tipo == "entradas"))
        ]
        formato = q.get("formato", ["ofx"])[0]
        if formato not in ("ofx", "xlsx"):
            return self.responder({"erro": "Formato invalido"}, 400)
        nome = "-".join(["extrato", *(str(x) for x in (de, ate) if x), *([tipo] if tipo != "todas" else [])])
        if formato == "xlsx":
            corpo = planilha.gerar_xlsx(linhas, descricao_do_filtro(de, ate, tipo))
            tipo_mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        else:
            corpo = db.exportar_ofx(linhas).encode("cp1252", "replace")
            tipo_mime = "application/x-ofx"
        self.send_response(200)
        self.send_header("Content-Type", tipo_mime)
        self.send_header("Content-Disposition", f'attachment; filename="{nome}.{formato}"')
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    # PUT = editar uma movimentação existente
    def do_PUT(self):
        id = self.id_da_url()
        campos = id and self.corpo_json()
        if campos:
            ok = db.atualizar(id, *campos)
            self.responder({"ok": True} if ok else {"erro": "Movimentacao nao existe"}, 200 if ok else 404)

    # DELETE = excluir uma movimentação
    def do_DELETE(self):
        id = self.id_da_url()
        if id:
            ok = db.excluir(id)
            self.responder({"ok": True} if ok else {"erro": "Movimentacao nao existe"}, 200 if ok else 404)

    # GET = listar as movimentações ou exportar
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/api/exportar":
            return self.exportar(parse_qs(url.query))
        if self.path != "/api/movimentacoes":
            return self.responder({"erro": "nao encontrado"}, 404)
        self.responder([
            {"id": i, "data": d, "valor": float(v), "descricao": desc}
            for i, d, v, desc, _ in db.listar()
        ])

    # POST = criar uma movimentação (JSON) ou importar um arquivo .ofx
    def do_POST(self):
        if self.path == "/api/movimentacoes":
            campos = self.corpo_json()
            if campos:
                db.criar(*campos)
                self.responder({"ok": True}, 201)
            return
        if self.path != "/api/importar":
            return self.responder({"erro": "nao encontrado"}, 404)
        corpo = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        try:
            transacoes = db.ler_ofx(io.BytesIO(corpo))
        except Exception:
            return self.responder({"erro": "Arquivo OFX invalido"}, 400)
        inseridas = db.salvar(transacoes)
        self.responder({"inseridas": inseridas, "ignoradas": len(transacoes) - inseridas})


# `python api.py` sobe o servidor só em localhost:8000 (uma thread por requisição)
if __name__ == "__main__":
    print("API em http://localhost:8000")
    ThreadingHTTPServer(("localhost", 8000), Handler).serve_forever()
