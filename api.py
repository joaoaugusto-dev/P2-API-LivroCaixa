import io
import json
from datetime import date
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import db


class Handler(BaseHTTPRequestHandler):
    def responder(self, dados, status=200):
        corpo = json.dumps(dados, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def corpo_json(self):
        """Valida o JSON de criar/editar; devolve (data, valor, descricao) ou None."""
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            data, valor, desc = date.fromisoformat(d["data"]), Decimal(str(d["valor"])), str(d["descricao"]).strip()
            assert desc and len(desc) <= 255 and valor.is_finite()
            return data, valor, desc
        except Exception:
            self.responder({"erro": "Informe data, valor e descricao validos"}, 400)

    def id_da_url(self):
        prefixo = "/api/movimentacoes/"
        if self.path.startswith(prefixo) and self.path[len(prefixo):].isdigit():
            return int(self.path[len(prefixo):])
        self.responder({"erro": "nao encontrado"}, 404)

    def do_PUT(self):
        id = self.id_da_url()
        campos = id and self.corpo_json()
        if campos:
            ok = db.atualizar(id, *campos)
            self.responder({"ok": True} if ok else {"erro": "Movimentacao nao existe"}, 200 if ok else 404)

    def do_DELETE(self):
        id = self.id_da_url()
        if id:
            ok = db.excluir(id)
            self.responder({"ok": True} if ok else {"erro": "Movimentacao nao existe"}, 200 if ok else 404)

    def do_GET(self):
        if self.path == "/api/exportar":
            corpo = db.exportar_ofx(db.listar()).encode("cp1252", "replace")
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ofx")
            self.send_header("Content-Disposition", 'attachment; filename="extrato-exportado.ofx"')
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            return self.wfile.write(corpo)
        if self.path != "/api/movimentacoes":
            return self.responder({"erro": "nao encontrado"}, 404)
        self.responder([
            {"id": i, "data": d, "valor": float(v), "descricao": desc}
            for i, d, v, desc, _ in db.listar()
        ])

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


if __name__ == "__main__":
    print("API em http://localhost:8000")
    ThreadingHTTPServer(("localhost", 8000), Handler).serve_forever()
