import io
import json
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

    def do_GET(self):
        if self.path != "/api/movimentacoes":
            return self.responder({"erro": "nao encontrado"}, 404)
        self.responder([
            {"id": i, "data": d, "valor": float(v), "descricao": desc}
            for i, d, v, desc in db.listar()
        ])

    def do_POST(self):
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
