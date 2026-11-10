"""Sirve escena.html y recibe los cuadros que manda cuando se abre con ?grabar=.

    python herramientas/hero-3d/servidor.py [puerto] [carpeta-de-cuadros]

Los cuadros quedan en <carpeta>/<clip>/0000.jpg, 0001.jpg... y al terminar se
escribe <carpeta>/<clip>/fin.txt. Después se arma el video con armar.py.
"""
import sys
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8793
SALIDA = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(tempfile.gettempdir()) / "rfk-hero-cuadros"
CLIPS = {"land", "port"}


class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(AQUI), **k)

    def do_POST(self):
        partes = [p for p in self.path.split("/") if p]
        cuerpo = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        if len(partes) >= 2 and partes[1] in CLIPS:
            carpeta = SALIDA / partes[1]
            carpeta.mkdir(parents=True, exist_ok=True)
            if partes[0] == "cuadro" and len(partes) == 3 and partes[2].isdigit():
                (carpeta / f"{int(partes[2]):04d}.jpg").write_bytes(cuerpo)
                return self._ok()
            if partes[0] == "fin":
                (carpeta / "fin.txt").write_bytes(cuerpo)
                return self._ok()
        self.send_error(400)

    def _ok(self):
        self.send_response(204)
        self.end_headers()

    def log_message(self, *a):  # los 280 POST por clip tapan todo lo demás
        pass


if __name__ == "__main__":
    print(f"http://localhost:{PUERTO}/escena.html  ->  {SALIDA}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Manejador).serve_forever()
