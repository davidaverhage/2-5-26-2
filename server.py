"""
server.py – Lightweight HTTP server that serves the built Wagic VPK.

Runs on port 8080 (configurable via the PORT environment variable) and
provides:
  GET /            – HTML landing page with a download link
  GET /wagic.vpk   – Direct VPK download
  GET /health      – Health-check endpoint for DigitalOcean App Platform
"""

import http.server
import os
import socketserver

PORT = int(os.environ.get("PORT", "8080"))
VPK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
VPK_PATH = os.path.join(VPK_DIR, "wagic.vpk")


class Handler(http.server.BaseHTTPRequestHandler):
    """Handle HTTP requests for the VPK download server."""

    def do_GET(self):  # noqa: N802 – required by BaseHTTPRequestHandler
        if self.path == "/health":
            self._respond(200, "text/plain", b"ok")
        elif self.path == "/wagic.vpk":
            self._serve_vpk()
        else:
            self._landing_page()

    # ------------------------------------------------------------------
    def _landing_page(self):
        vpk_exists = os.path.isfile(VPK_PATH)
        vpk_size = ""
        if vpk_exists:
            size_bytes = os.path.getsize(VPK_PATH)
            if size_bytes >= 1_048_576:
                vpk_size = f" ({size_bytes / 1_048_576:.1f} MB)"
            else:
                vpk_size = f" ({size_bytes / 1_024:.1f} KB)"

        status = "ready for download" if vpk_exists else "not available"
        download_link = (
            '<a href="/wagic.vpk">Download wagic.vpk</a>'
            if vpk_exists
            else "<em>VPK file was not produced by the build.</em>"
        )

        html = f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Wagic VPK Builder</title>
<style>
  body {{ font-family: sans-serif; max-width: 640px; margin: 2rem auto; }}
  h1 {{ color: #0069ff; }}
  .status {{ padding: .5rem 1rem; border-radius: 4px; }}
  .ok {{ background: #e6ffed; color: #22863a; }}
  .err {{ background: #ffeef0; color: #cb2431; }}
</style></head>
<body>
  <h1>Wagic VPK Builder</h1>
  <p>This service builds
     <a href="https://github.com/WagicProject/wagic">Wagic, the Homebrew?!</a>
     as a PS Vita <code>.vpk</code> package.</p>
  <p class="status {'ok' if vpk_exists else 'err'}">
     Status: <strong>{status}</strong>{vpk_size}</p>
  <p>{download_link}</p>
  <hr>
  <p><small>Powered by DigitalOcean App Platform</small></p>
</body></html>
"""
        self._respond(200, "text/html", html.encode())

    # ------------------------------------------------------------------
    def _serve_vpk(self):
        if not os.path.isfile(VPK_PATH):
            self._respond(404, "text/plain", b"VPK file not found")
            return

        with open(VPK_PATH, "rb") as f:
            data = f.read()

        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition",
                         'attachment; filename="wagic.vpk"')
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ------------------------------------------------------------------
    def _respond(self, code, content_type, body):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving on port {PORT} – VPK dir: {VPK_DIR}")
        httpd.serve_forever()
