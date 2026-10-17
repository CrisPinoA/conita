# Servidor local para desarrollo (no se usa en GitHub Pages).
# Fuerza los tipos MIME correctos: en Windows el registro a veces sirve .js como text/plain.
import http.server

PORT = 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.ttf': 'font/ttf',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.png': 'image/png',
        '.json': 'application/json',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    print(f'http://127.0.0.1:{PORT}')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
