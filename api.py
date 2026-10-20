"""API HTTP mínima (só biblioteca padrão do Python). É a ponte entre a interface React (web/) e o banco (db.py)."""
import io
import json
import re
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
            self.categoria_id = d.get("categoria_id")  # opcional: a categoria escolhida ao criar
            assert self.categoria_id is None or isinstance(self.categoria_id, int)
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
            nomes = {c[0]: c[1] for c in db.listar_categorias()}  # id -> nome, para a coluna Categoria
            corpo = planilha.gerar_xlsx(linhas, descricao_do_filtro(de, ate, tipo), nomes)
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

    # Lê o corpo da requisição como JSON (devolve {} se vier vazio ou inválido)
    def ler_json(self):
        try:
            return json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)))) or {}
        except Exception:
            return {}

    # Valida nome (até 40 letras) e cor (1 a 8) de uma categoria; devolve (nome, cor) ou None
    def corpo_categoria(self):
        d = self.ler_json()
        nome, cor = str(d.get("nome", "")).strip(), d.get("cor", 1)
        if not nome or len(nome) > 40 or not isinstance(cor, int) or not 1 <= cor <= 8:
            return self.responder({"erro": "Informe um nome (até 40 letras) e uma cor válida"}, 400)
        return nome, cor

    # Extrai o número de rotas como /api/categorias/7 ou /api/movimentacoes/7/categoria
    def numero_em(self, modelo):
        m = re.fullmatch(modelo, self.path)
        return int(m.group(1)) if m else None

    # PUT = editar uma movimentação, trocar a categoria dela ou editar uma categoria
    def do_PUT(self):
        mov_cat = self.numero_em(r"/api/movimentacoes/(\d+)/categoria")
        if mov_cat:  # escolha da pessoa: vira exemplo para o classificador aprender
            cat = self.ler_json().get("categoria_id")
            if cat is not None and not isinstance(cat, int):
                return self.responder({"erro": "Categoria invalida"}, 400)
            try:
                atualizadas = db.definir_categoria(mov_cat, cat)
            except Exception:
                return self.responder({"erro": "Categoria nao existe"}, 400)
            if atualizadas is None:
                return self.responder({"erro": "Movimentacao nao existe"}, 404)
            return self.responder({"ok": True, "atualizadas": atualizadas})
        cat_id = self.numero_em(r"/api/categorias/(\d+)")
        if cat_id:
            campos = self.corpo_categoria()
            if campos:
                try:
                    ok = db.atualizar_categoria(cat_id, *campos)
                except ValueError as e:
                    return self.responder({"erro": str(e)}, 409)
                self.responder({"ok": True} if ok else {"erro": "Categoria nao existe"}, 200 if ok else 404)
            return
        id = self.id_da_url()
        campos = id and self.corpo_json()
        if campos:
            ok = db.atualizar(id, *campos)
            self.responder({"ok": True} if ok else {"erro": "Movimentacao nao existe"}, 200 if ok else 404)

    # DELETE = excluir uma movimentação ou uma categoria
    def do_DELETE(self):
        cat_id = self.numero_em(r"/api/categorias/(\d+)")
        if cat_id:
            ok = db.excluir_categoria(cat_id)
            return self.responder({"ok": True} if ok else {"erro": "Categoria nao existe"}, 200 if ok else 404)
        id = self.id_da_url()
        if id:
            ok = db.excluir(id)
            self.responder({"ok": True} if ok else {"erro": "Movimentacao nao existe"}, 200 if ok else 404)

    # GET = listar movimentações, listar categorias ou exportar
    def do_GET(self):
        url = urlsplit(self.path)
        if url.path == "/api/exportar":
            return self.exportar(parse_qs(url.query))
        if self.path == "/api/categorias":
            return self.responder([
                {"id": i, "nome": nome, "cor": cor, "qtd": qtd, "total": float(total)}
                for i, nome, cor, qtd, total in db.listar_categorias()
            ])
        if self.path != "/api/movimentacoes":
            return self.responder({"erro": "nao encontrado"}, 404)
        self.responder([
            {"id": i, "data": d, "valor": float(v), "descricao": desc,
             "categoria_id": cat, "auto": auto, "confianca": conf}
            for i, d, v, desc, _, cat, auto, conf in db.listar()
        ])

    # POST = criar movimentação ou categoria, reclassificar tudo, ou importar um arquivo .ofx
    def do_POST(self):
        if self.path == "/api/movimentacoes":
            campos = self.corpo_json()
            if campos:
                db.criar(*campos, categoria_id=self.categoria_id)
                self.responder({"ok": True}, 201)
            return
        if self.path == "/api/categorias":
            campos = self.corpo_categoria()
            if campos:
                try:
                    novo = db.criar_categoria(*campos)
                except ValueError as e:
                    return self.responder({"erro": str(e)}, 409)
                self.responder({"ok": True, "id": novo}, 201)
            return
        if self.path == "/api/categorias/reclassificar":
            return self.responder({"ok": True, "mudaram": db.reclassificar()})
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
