"""Servidor local de desenvolvimento do Rastro (sem cache, para ver mudanças na hora).

Uso:  python tools/servidor.py   ->  http://localhost:8765
"""
import functools
import http.server
import os

PASTA = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTA = int(os.environ.get("PORT") or os.environ.get("PORTA") or "8765")


class SemCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(SemCache, directory=PASTA)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORTA), handler) as srv:
        print(f"Rastro em http://localhost:{PORTA}")
        srv.serve_forever()
