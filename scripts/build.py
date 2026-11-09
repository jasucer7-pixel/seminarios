#!/usr/bin/env python3
"""Genera un único HTML autocontenido con todos los textos.

Uso:
  python3 scripts/build.py                 -> dist/seminarios.html (documento completo)
  python3 scripts/build.py --fragment OUT  -> fragmento sin <html>/<head> (para publicar como Artifact)
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8")

def inline_script(m):
    src = m.group(1)
    code = (root / src).read_text(encoding="utf-8")
    return "<script>\n" + code.replace("</script", "<\\/script") + "\n</script>"

html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + css + "\n</style>")
html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)

if len(sys.argv) > 2 and sys.argv[1] == "--fragment":
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", head)
    out = pathlib.Path(sys.argv[2])
    out.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
else:
    out = root / "dist" / "seminarios.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
print("OK ->", out)
