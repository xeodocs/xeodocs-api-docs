#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8080
DIRECTORY = "/app/api-design"

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With')
        super().end_headers()

    def do_GET(self):
        if self.path.endswith('.yml') or self.path.endswith('.yaml'):
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            try:
                with open(os.path.join(DIRECTORY, self.path.lstrip('/')), 'r') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            except FileNotFoundError:
                self.send_error(404, "File not found")
        else:
            super().do_GET()

if __name__ == '__main__':
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
