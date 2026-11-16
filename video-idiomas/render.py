"""Ejemplo de 10 s estilo "kinetic typography" para un video sobre aprender idiomas.
Genera frames con PIL + un audio sintetizado (beat + golpes) y lo monta con ffmpeg.
Uso: python3 render.py  ->  idiomas_10s.mp4
"""
import math, random, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, DUR = 1920, 1080, 30, 10.0
N = int(FPS * DUR)
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
FONT_B = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
WHITE, BLACK = (255, 255, 255), (12, 12, 12)
BLUE, RED, YELLOW = (20, 40, 235), (238, 24, 24), (205, 230, 40)
random.seed(3); np.random.seed(3)
_font_cache = {}


def font(size, path=FONT):
    k = (size, path)
    if k not in _font_cache:
        _font_cache[k] = ImageFont.truetype(path, size)
    return _font_cache[k]


def text_layer(txt, size, color, tracking=-0.06, path=FONT):
    """Texto en minúsculas con tracking negativo (look Helvetica apretado)."""
    f = font(size, path)
    track = int(size * tracking)
    widths = [f.getlength(c) for c in txt]
    total = int(sum(widths) + track * (len(txt) - 1)) + 20
    asc, desc = f.getmetrics()
    img = Image.new("RGBA", (max(total, 1), asc + desc + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = 10
    for c, w in zip(txt, widths):
        d.text((x, 10), c, font=f, fill=color)
        x += w + track
    return img.crop(img.getbbox())


def ease_out(t):
    t = min(max(t, 0), 1)
    return 1 - (1 - t) ** 3


def paste_scaled(canvas, layer, cx, cy, scale=1.0, anchor="c"):
    if scale != 1.0:
        layer = layer.resize((max(1, int(layer.width * scale)), max(1, int(layer.height * scale))), Image.LANCZOS)
    if anchor == "c":
        x, y = cx - layer.width // 2, cy - layer.height // 2
    else:  # top-left
        x, y = cx, cy
    canvas.alpha_composite(layer, (int(x), int(y)))


def punch(local_f, dur=5, amount=0.18):
    """Zoom de 'golpe' al aparecer: 1+amount -> 1."""
    return 1 + amount * (1 - ease_out(local_f / dur))


def starburst(size, color, points=7, inner=0.42, rot=0.0):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = size / 2
    pts = []
    for i in range(points * 2):
        r = c if i % 2 == 0 else c * inner
        a = rot + i * math.pi / points
        pts.append((c + r * math.cos(a), c + r * math.sin(a)))
    d.polygon(pts, fill=color)
    return img


# grano precalculado
GRAIN = [Image.fromarray(np.clip(np.random.normal(128, 22, (H // 2, W // 2)), 0, 255).astype(np.uint8)).resize((W, H))
         for _ in range(6)]


def finish(canvas, f, shake=0.0, glitch=False):
    img = canvas.convert("RGB")
    if shake:
        dx, dy = random.randint(-1, 1) * shake, random.randint(-1, 1) * shake
        img = img.transform(img.size, Image.AFFINE, (1, 0, dx, 0, 1, dy), fillcolor=img.getpixel((5, 5)))
    if glitch:  # separación RGB tipo transición
        r, g, b = img.split()
        r = r.transform(img.size, Image.AFFINE, (1, 0, -14, 0, 1, 0))
        b = b.transform(img.size, Image.AFFINE, (1, 0, 14, 0, 1, 0))
        img = Image.merge("RGB", (r, g, b))
    arr = np.asarray(img).astype(np.int16) + (np.asarray(GRAIN[f % len(GRAIN)]).astype(np.int16)[..., None] - 128) // 5
    # viñeta suave
    return np.clip(arr, 0, 255).astype(np.uint8)


# ---------- escenas ----------
# Cada escena: (inicio_s, fin_s, función)

def s1(f, lf):
    """0.0-2.4  'llevas 6 años' / 'estudiando inglés.'  palabra a palabra"""
    c = Image.new("RGBA", (W, H), WHITE + (255,))
    words = [("llevas", 0), ("6 años", 7), ("estudiando", 18), ("inglés.", 28)]
    y_rows = {0: 330, 7: 330, 18: 620, 28: 620}
    x = {0: 140}
    lines = [[], []]
    for w, start in words:
        if lf >= start:
            lines[0 if start < 18 else 1].append((w, start))
    for row, items in enumerate(lines):
        xx = 140
        for w, start in items:
            col = RED if w == "6 años" else BLACK
            lay = text_layer(w, 215, col)
            s = punch(lf - start, 4, 0.12)
            paste_scaled(c, lay, xx + lay.width // 2, (330 if row == 0 else 620) + 120, s)
            xx += lay.width + 55
    return c, 0, lf in (0, 1)


def s2(f, lf):
    """2.4-4.4  'y no puedes pedir un café.' -> fondo negro, fuerte"""
    c = Image.new("RGBA", (W, H), BLACK + (255,))
    l1 = text_layer("y no puedes", 210, WHITE)
    paste_scaled(c, l1, 130, 200, 1, "tl")
    if lf >= 22:  # marcador amarillo detrás del texto
        d = ImageDraw.Draw(c)
        p = ease_out((lf - 22) / 6)
        l2 = text_layer("pedir un café.", 210, BLACK)
        d.rectangle([105, 545, 105 + int((l2.width + 55) * p), 575 + l2.height], fill=YELLOW + (255,))
    if lf >= 10:
        l2 = text_layer("pedir un café.", 210, WHITE if lf < 22 else BLACK)
        paste_scaled(c, l2, 130 + l2.width // 2, 560 + l2.height // 2, punch(lf - 10, 5, 0.1))
    return c, 2 if lf > 22 else 0, lf in (0, 1)


def s3(f, lf):
    """4.4-6.4  'apps ≠ idioma'  azul gigante, estilo 'you > you'"""
    c = Image.new("RGBA", (W, H), (226, 236, 250, 255))
    # estrella amarilla girando detrás
    st = starburst(1100, YELLOW + (255,), 6, 0.35, rot=lf * 0.035)
    paste_scaled(c, st, W // 2 + 260, H // 2, ease_out(lf / 8))
    a = text_layer("apps", 280, BLUE)
    neq = text_layer("≠", 280, BLUE, path=FONT)
    b = text_layer("idioma", 280, BLUE)
    y = H // 2 + 40
    if lf >= 0:
        paste_scaled(c, a, 90 + a.width // 2, y, punch(lf, 4, 0.15))
    if lf >= 9:
        paste_scaled(c, neq, 90 + a.width + 40 + neq.width // 2, y, punch(lf - 9, 4, 0.3))
    if lf >= 16:
        paste_scaled(c, b, 90 + a.width + neq.width + 80 + b.width // 2, y, punch(lf - 16, 4, 0.15))
    # subtítulo tipo caption
    if lf >= 30:
        cap = text_layer("(y lo sabes)", 70, BLACK, -0.03, FONT)
        paste_scaled(c, cap, 110, 820, 1, "tl")
    return c, 0, lf in (0, 1)


def s4(f, lf):
    """6.4-8.4  'input > reglas'  rojo, lista que se apila"""
    c = Image.new("RGBA", (W, H), WHITE + (255,))
    big = text_layer("input", 420, RED)
    paste_scaled(c, big, W // 2 - 220, 330, punch(lf, 6, 0.25))
    gt = text_layer("> reglas", 200, BLACK)
    if lf >= 10:
        paste_scaled(c, gt, W // 2 + 180, 760, punch(lf - 10, 4, 0.15))
    # tachar 'reglas'
    if lf >= 24:
        d = ImageDraw.Draw(c)
        p = ease_out((lf - 24) / 5)
        x0 = W // 2 + 180 - gt.width // 2 + 150
        d.rectangle([x0, 760 - 8, x0 + int((gt.width - 150) * p), 760 + 14], fill=RED + (255,))
    return c, 3 if lf < 6 else 0, lf in (0, 1)


def s5(f, lf):
    """8.4-10.0  'empieza hoy.' blanco sobre negro, parpadeo tipo 'start right now.'"""
    bg = BLACK if (lf // 2) % 7 != 3 else (40, 40, 40)
    c = Image.new("RGBA", (W, H), bg + (255,))
    for i, (w, start) in enumerate([("habla", 0), ("desde", 6), ("el día 1.", 12)]):
        if lf >= start:
            lay = text_layer(w, 250, WHITE, -0.07, FONT_B)
            paste_scaled(c, lay, 120 + lay.width // 2, 140 + i * 280 + lay.height // 2, punch(lf - start, 4, 0.12))
    if lf >= 30:
        cap = text_layer("cómo aprender idiomas (de verdad).", 56, (200, 200, 200), -0.02)
        paste_scaled(c, cap, 120, 980, 1, "tl")
    return c, 0, lf in (0, 1)


SCENES = [(0.0, 2.4, s1), (2.4, 4.4, s2), (4.4, 6.4, s3), (6.4, 8.4, s4), (8.4, 10.0, s5)]


def render_video(path_noaudio):
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium",
                          "-crf", "18", "-pix_fmt", "yuv420p", path_noaudio], stdin=subprocess.PIPE)
    for f in range(N):
        t = f / FPS
        for a, b, fn in SCENES:
            if a <= t < b:
                lf = f - int(round(a * FPS))
                canvas, shake, glitch = fn(f, lf)
                break
        p.stdin.write(finish(canvas, f, shake, glitch).tobytes())
    p.stdin.close(); p.wait()


# ---------- audio ----------
SR = 44100


def make_audio(path):
    n = int(SR * DUR)
    out = np.zeros(n)
    t = np.arange(n) / SR

    def add(sig, at):
        i = int(at * SR); j = min(n, i + len(sig)); out[i:j] += sig[: j - i]

    def kick():
        tt = np.arange(int(0.35 * SR)) / SR
        f = 45 + 110 * np.exp(-tt * 30)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.9

    def hat():
        tt = np.arange(int(0.05 * SR)) / SR
        return np.random.uniform(-1, 1, len(tt)) * np.exp(-tt * 90) * 0.18

    def hit():  # golpe para cortes
        tt = np.arange(int(0.25 * SR)) / SR
        return (np.random.uniform(-1, 1, len(tt)) * np.exp(-tt * 25) * 0.35 + np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 12) * 0.5)

    bpm = 120; beat = 60 / bpm
    for k in range(int(DUR / beat)):
        add(kick(), k * beat)
        add(hat(), k * beat + beat / 2)
    # pad grave
    out += 0.06 * np.sin(2 * np.pi * 55 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    for a, _, _ in SCENES[1:]:
        add(hit(), a)
    # 'ticks' en apariciones de palabras
    for s, offs in [(0.0, [0, 7, 18, 28]), (4.4, [0, 9, 16]), (6.4, [0, 10]), (8.4, [0, 6, 12])]:
        for o in offs:
            tt = np.arange(int(0.03 * SR)) / SR
            add(np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 150) * 0.25, s + o / FPS)
    fade = np.ones(n); fade[-int(0.4 * SR):] = np.linspace(1, 0, int(0.4 * SR))
    out = np.tanh(out * 1.3) * fade * 0.8
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    render_video("_v.mp4")
    make_audio("_a.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "_v.mp4", "-i", "_a.wav", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "idiomas_10s.mp4"], check=True)
    print("ok -> idiomas_10s.mp4")
