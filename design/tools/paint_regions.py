"""Pinta un fondo por región, inspirado (no copiado) en el arte oficial de LoL Universe.

Uso (desde design/):  python tools/paint_regions.py [freljord shurima void noxus targon]
Salida: assets/regions/<region>.jpg (1600×900). Islas de la Sombra reutiliza assets/menu-bg.jpg.
"""
import pathlib
import sys
import numpy as np
import paintlib as P

P.setup(1600, 900)
from paintlib import *  # noqa: E402,F401

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "regions"


def trees(n, ybase, hmin, hmax, seed, xmin=0, xmax=None):
    """Pinos como polígonos dentados (se vuelven orgánicos en polys)."""
    r = np.random.default_rng(seed)
    out = []
    for _ in range(n):
        x = xmin + r.random() * ((xmax or W) - xmin)
        h = hmin + r.random() * (hmax - hmin)
        w = h * (0.28 + r.random() * 0.1)
        y = ybase + r.random() * 30
        pts = [(x, y - h)]
        for k in range(1, 6):
            t = k / 5
            pts.append((x + w * t * 0.5 + w * 0.12, y - h + h * t - h * 0.06))
            pts.append((x + w * t * 0.5, y - h + h * t))
        pts += [(x + 3, y), (x - 3, y)]
        for k in range(5, 0, -1):
            t = k / 5
            pts.append((x - w * t * 0.5, y - h + h * t))
            pts.append((x - w * t * 0.5 - w * 0.12, y - h + h * t - h * 0.06))
        out.append(pts)
    return out


def freljord():
    img = vgrad(col(40, 60, 88), col(176, 196, 214), 0, 0.62, 1.2)
    cl = warp(fbm(600, 220, 6, 1), 220, 320, 2)
    img = mix(img, col(205, 220, 232), smooth(0.5, 0.78, cl) * (1 - smooth(0.3, 0.55, yy)) * 0.7)
    for base, amp, cell, c_, s in [(470, 330, 620, col(150, 175, 200), 11), (520, 230, 380, col(95, 122, 155), 12), (575, 150, 240, col(52, 74, 100), 13)]:
        m, h = ridge_mask(base, amp, cell, s, sharp=1.4, rough=10)
        snow = smooth(0.45, 0.62, warp(fbm(40, 18, 5, s + 3), 20, 40, s + 4) + (h[None, :] - Y) / 900)
        img = mix(img, c_ * (0.85 + 0.3 * fbm(50, 25, 4, s + 9))[..., None], m)
        img = mix(img, col(225, 236, 245), m * snow * 0.75)
        img = add(img, col(190, 210, 230), warp(fbm(400, 60, 5, s + 7), 80, 160, s + 8) * np.exp(-((Y - base - 10) / 50) ** 2) * 0.25)
    # ciudadela de Hielo Verdadero a la derecha
    ice = polys([[(1040, 640), (1060, 300), (1110, 170), (1180, 90), (1260, 60), (1330, 120), (1390, 210), (1420, 330), (1470, 420), (1500, 640)],
                 [(960, 640), (985, 470), (1030, 420), (1060, 640)]], rough=26, cell=40, seed=20, soft=1.6)
    veins = 1 - smooth(0.0, 0.025, np.abs(warp(fbm(110, 70, 5, 21), 60, 80, 22) - 0.5))
    strata = 0.75 + 0.25 * np.sin(X * 0.05 + fbm(30, 260, 4, 25) * 9)          # caras verticales del acantilado
    shade = (0.45 + 0.7 * smooth(1060, 1420, X)) * strata * (0.75 + 0.35 * fbm(24, 50, 4, 23))
    img = mix(img, col(30, 62, 112) * shade[..., None], ice)
    img = add(img, col(110, 190, 255), ice * (veins * 0.45 + smooth(0.6, 0.9, fbm(60, 140, 4, 24)) * 0.3) * smooth(640, 200, Y))
    img = add(img, col(225, 240, 255), ice * smooth(0.62, 0.8, warp(fbm(30, 14, 4, 26), 12, 24, 27)) * 0.55)  # nieve en repisas
    img = add(img, col(80, 160, 255), blur(ice, 50) * 0.22)
    # valle y bosque
    vall = smooth(600, 640, Y)
    img = mix(img, col(180, 196, 205) * (0.8 + 0.3 * fbm(60, 12, 5, 30))[..., None], vall)
    img = mix(img, col(70, 100, 70), vall * smooth(0.55, 0.75, fbm(80, 30, 5, 31)) * 0.5)
    far = polys(trees(160, 650, 25, 55, 32), rough=4, cell=8, seed=33, soft=0.8)
    img = mix(img, col(40, 60, 70), far * 0.85)
    near = polys(trees(26, 900, 220, 420, 34, xmin=980) + trees(10, 900, 200, 360, 35, xmax=420), rough=10, cell=14, seed=36, soft=1.0)
    img = mix(img, col(10, 18, 26), near)
    img = add(img, col(120, 150, 180), near * 0.05)                              # leve luz fría sobre los pinos
    img = add(img, col(240, 245, 255), particles(420, 0, H, 1.6, 38) * 0.6)
    img = add(img, col(210, 225, 240), warp(fbm(500, 160, 5, 39), 200, 300, 40) * smooth(0.6, 1.0, yy) * 0.2)
    return img


def shurima():
    img = vgrad(col(110, 135, 160), col(242, 208, 150), 0, 0.6, 0.9)
    SX, SY = 1180.0, 175.0
    d = np.hypot(X - SX, Y - SY)
    img = add(img, col(255, 210, 120), np.exp(-d / 260) * 0.8)
    cl = warp(fbm(520, 260, 6, 1), 260, 360, 2)
    cloud = smooth(0.45, 0.75, cl) * (1 - smooth(0.35, 0.6, yy))
    img = mix(img, col(214, 170, 120) * (0.7 + 0.7 * np.exp(-d / 420))[..., None], cloud * 0.8)
    ang = np.arctan2(Y - SY, X - SX)
    rays = noise(1600 / 26, 10 ** 5, 3)[0][((ang + np.pi) / (2 * np.pi) * (W - 1)).astype(int)]
    img = add(img, col(255, 220, 150), blur(smooth(0.55, 1, rays), 4) * np.exp(-d / 700) * 0.22)
    # Disco Solar: anillo segmentado dorado
    ring = smooth(118, 112, np.abs(d - 128) + 104) * (np.abs(d - 128) < 26)
    seg = 0.75 + 0.25 * np.cos(ang * 36) * smooth(0.3, 0.7, fbm(30, 30, 3, 4))
    img = mix(img, col(236, 186, 92) * seg[..., None], blur(ring.astype(np.float32), 1.2))
    img = add(img, col(255, 236, 170), blur((np.abs(d - 128) < 3).astype(np.float32), 2) * 0.8)
    # torres lejanas de arenisca
    rr = np.random.default_rng(5)
    towers = []
    for x in list(rr.uniform(820, 1500, 9)) + list(rr.uniform(120, 420, 4)):
        w_, h_ = rr.uniform(26, 60), rr.uniform(160, 380)
        towers.append([(x - w_, 560), (x - w_ * 0.6, 560 - h_ * 0.7), (x - w_ * 0.25, 560 - h_), (x, 560 - h_ - h_ * 0.18), (x + w_ * 0.25, 560 - h_), (x + w_ * 0.6, 560 - h_ * 0.7), (x + w_, 560)])
    tw = polys(towers, rough=8, cell=16, seed=6)
    haze = smooth(560, 160, Y)
    stone = col(176, 120, 84) * (0.8 + 0.3 * fbm(16, 50, 3, 7))[..., None]
    img = mix(img, stone * (1 - haze[..., None]) + col(232, 196, 150) * haze[..., None], tw * 0.8)
    img = add(img, col(255, 200, 120), tw * particles(120, 200, 560, 0.7, 70, 100, 1520) * 0.8)
    # pirámide con cara iluminada y cara en sombra
    pyr = polys([[(380, 640), (640, 230), (900, 640)]], rough=6, cell=20, seed=8, soft=1)
    lit = X < 640 - (Y - 230) * 0.02
    courses = 0.9 + 0.1 * (np.sin(Y * 0.55) > 0.6)
    wear = 0.8 + 0.35 * warp(fbm(18, 18, 4, 9), 20, 30, 19)
    img = mix(img, np.where(lit[..., None], col(214, 150, 98), col(126, 78, 56)) * (courses * wear)[..., None], pyr)
    img = add(img, col(240, 210, 160), warp(fbm(500, 80, 5, 10), 120, 180, 11) * np.exp(-((Y - 600) / 70) ** 2) * 0.35)
    # dunas
    for base, amp, cell, c1, c2, s in [(640, 50, 500, col(205, 150, 98), col(140, 90, 62), 12), (720, 70, 700, col(190, 128, 78), col(112, 68, 48), 13), (820, 90, 900, col(164, 102, 62), col(80, 48, 36), 14)]:
        m, h = ridge_mask(base, amp, cell, s, sharp=1.0, rough=2)
        slope = np.gradient(smooth1(h, 10))[None, :]
        shade = 0.45 + (smooth(-0.25, 0.25, slope) - 0.45) * np.exp(-np.clip(Y - h[None, :], 0, None) / 45)
        rip = 0.93 + 0.07 * np.sin((Y - h[None, :]) * 0.3 + warp(fbm(120, 40, 3, s + 1), 40, 60, s + 2) * 18)
        img = mix(img, (c1 * (1 - shade[..., None]) + c2 * shade[..., None]) * rip[..., None], m)
    img = add(img, col(255, 210, 150), particles(160, 300, H, 1.8, 15) * 0.4)
    img = add(img, col(230, 190, 140), warp(fbm(600, 150, 5, 16), 200, 300, 17) * smooth(0.5, 1, yy) * 0.12)
    return img


def void():
    CX, CY = 800.0, 430.0
    dx, dy = X - CX, (Y - CY) * 1.15
    r = np.hypot(dx, dy) + 1
    th = np.arctan2(dy, dx)
    turb = fbm(140, 140, 5, 1)
    spiral = np.sin(th * 3 + np.log(r) * 4.2 + turb * 5)
    core = np.exp(-r / 190)
    img = col(24, 8, 34) * np.ones((H, W, 1), np.float32)
    img = add(img, col(150, 60, 210), smooth(-0.2, 1, spiral) * np.exp(-r / 520) * 0.9)
    img = add(img, col(255, 150, 250), core * 1.3)
    img = add(img, col(255, 230, 255), np.exp(-r / 60) * 0.8)
    veins = 1 - smooth(0, 0.06, np.abs(warp(fbm(70, 70, 5, 2), 50, 60, 3) - 0.5))
    img = add(img, col(255, 160, 240), veins * np.exp(-r / 300) * 0.5)
    # costillas orgánicas en espiral
    band = np.sin(th * 2 + np.log(r) * 2.4 + (turb - 0.5) * 1.2 + 1.2)
    band = warp(band, 10, 60, 4)
    ribs = smooth(0.55, 0.8, band) * smooth(110, 240, r)
    vol = smooth(0.55, 1.0, band)                                                 # volumen: centro del nervio iluminado
    tex = 0.7 + 0.45 * warp(fbm(10, 30, 4, 5), 8, 20, 8)
    img = mix(img, col(70, 60, 40) * (tex * (0.6 + 0.8 * vol))[..., None], ribs * 0.97)
    img = add(img, col(255, 190, 230), ribs * smooth(0.92, 1.0, band) * np.exp(-r / 500) * 0.7)
    img = add(img, col(255, 120, 230), blur(ribs, 14) * core * 0.6)
    img = mix(img, col(10, 4, 14), smooth(380, 900, r) * 0.8)
    img = add(img, col(255, 150, 240), particles(140, 0, H, 2.2, 7) * 0.5)
    return img


def noxus():
    img = vgrad(col(40, 58, 62), col(186, 170, 128), 0, 0.7, 1.0)
    img = mix(img, col(214, 186, 128), smooth(700, 1500, X) * (1 - smooth(0.2, 0.7, yy)) * 0.45)
    cl = warp(fbm(520, 300, 6, 1), 260, 360, 2)
    img = mix(img, col(34, 46, 48) * (0.8 + 0.4 * smooth(800, 1500, X))[..., None], smooth(0.48, 0.78, cl) * (1 - smooth(0.35, 0.65, yy)) * 0.85)
    # Bastión Inmortal: dos pilares y travesaño, envueltos en bruma
    bx = 800
    def tower(sg):
        return [(bx + sg * 60, 540), (bx + sg * 210, 540), (bx + sg * 170, 330), (bx + sg * 150, 120), (bx + sg * 160, 80),
                (bx + sg * 140, 40), (bx + sg * 128, 70), (bx + sg * 112, 18), (bx + sg * 96, 70), (bx + sg * 80, 44),
                (bx + sg * 68, 120), (bx + sg * 62, 330)]
    bast = polys([tower(-1), tower(1),
                  [(bx - 70, 150), (bx + 70, 150), (bx + 70, 200), (bx + 40, 215), (bx, 240), (bx - 40, 215), (bx - 70, 200)],
                  [(bx - 70, 540), (bx - 60, 380), (bx - 30, 330), (bx, 300), (bx + 30, 330), (bx + 60, 380), (bx + 70, 540)]],
                 rough=5, cell=24, seed=3)
    faces = 0.75 + 0.25 * np.sin(X * 0.09) * smooth(0.3, 0.6, fbm(30, 200, 3, 41))
    haze = smooth(560, 40, Y) * 0.55
    stone = col(120, 118, 104) * (faces * (0.8 + 0.3 * fbm(14, 70, 4, 4)))[..., None]
    img = mix(img, stone * (1 - haze[..., None]) + col(196, 188, 156) * haze[..., None], bast)
    img = add(img, col(255, 150, 70), bast * particles(40, 120, 520, 0.9, 42, 600, 1000) * 0.9)
    img = add(img, col(220, 210, 180), warp(fbm(300, 300, 5, 5), 150, 200, 6) * smooth(0, 0.45, yy) * (1 - smooth(0.45, 0.6, yy)) * 0.25)
    # muralla con torres
    rr = np.random.default_rng(8)
    walls = [[(0, 600), (0, 470), (1600, 440), (1600, 600)]]
    for x in rr.uniform(0, 1600, 14):
        w_, h_ = rr.uniform(26, 50), rr.uniform(60, 150)
        walls.append([(x - w_, 520), (x - w_, 460 - h_), (x, 440 - h_ - 30), (x + w_, 460 - h_), (x + w_, 520)])
    wl = polys(walls, rough=5, cell=12, seed=9)
    img = mix(img, col(70, 72, 66) * (0.8 + 0.3 * fbm(14, 30, 4, 10))[..., None], wl)
    img = add(img, col(200, 190, 160), warp(fbm(400, 60, 5, 11), 80, 160, 12) * np.exp(-((Y - 520) / 60) ** 2) * 0.3)
    # ciudad en primer plano con fuegos
    def town(n, y0, y1, hmin, hmax, wmin, wmax, seed):
        g = np.random.default_rng(seed)
        out = []
        for _ in range(n):
            x, y = g.uniform(-60, 1660), g.uniform(y0, y1)
            w_, h_ = g.uniform(wmin, wmax), g.uniform(hmin, hmax)
            roof = g.integers(0, 3)
            top = [(x + w_ * 0.5, y - h_ - g.uniform(14, 40))] if roof == 0 else [(x + w_ * 0.2, y - h_ - 18), (x + w_ * 0.8, y - h_ - 18)] if roof == 1 else []
            out.append([(x, y + 80), (x, y - h_)] + top + [(x + w_, y - h_), (x + w_, y + 80)])
        return out
    mid = polys(town(120, 600, 680, 30, 90, 30, 80, 13), rough=3, cell=8, seed=14, soft=0.8)
    img = mix(img, col(66, 64, 58) * (0.8 + 0.3 * fbm(10, 10, 3, 15))[..., None], np.maximum(mid, smooth(640, 680, Y)))
    img = add(img, col(200, 190, 160), warp(fbm(400, 50, 5, 43), 80, 160, 44) * np.exp(-((Y - 650) / 40) ** 2) * 0.25)
    city = polys(town(60, 760, 900, 80, 220, 60, 150, 16), rough=4, cell=10, seed=17, soft=0.8)
    img = mix(img, col(24, 22, 20) * (0.8 + 0.4 * fbm(10, 10, 3, 18))[..., None], np.maximum(city, smooth(820, 860, Y)))
    img = add(img, col(255, 160, 70), np.maximum(city, mid) * particles(260, 560, 880, 0.6, 45) * 1.2)
    fires = particles(60, 600, 880, 3.5, 15)
    img = add(img, col(255, 140, 50), fires * 0.9 + blur(fires, 18) * 1.4)
    img = add(img, col(255, 170, 80), particles(200, 300, 880, 1.3, 16) * 0.5)
    smoke = warp(fbm(260, 360, 6, 17), 200, 260, 18)
    img = mix(img, col(60, 56, 50), smooth(0.55, 0.85, smoke) * smooth(0.45, 0.9, yy) * 0.45)
    return img


def targon():
    img = vgrad(col(10, 18, 40), col(150, 175, 205), 0, 0.75, 1.3)
    img = add(img, col(130, 110, 220), smooth(0.55, 0.8, warp(fbm(260, 120, 6, 1), 140, 200, 2)) * (1 - smooth(0.1, 0.4, yy)) * 0.35)
    img = add(img, col(255, 255, 255), particles(500, 0, 380, 0.9, 3) * 0.8)
    # picos nevados (el monte, alto y afilado)
    xs = np.arange(W, dtype=np.float32)
    for base, amp, cell, c_, s, ex in [(560, 200, 260, col(176, 194, 218), 11, 470 * np.exp(-((xs - 1160) / 150) ** 2)),
                                       (640, 160, 200, col(118, 138, 168), 12, 0 * xs)]:
        m, h = ridge_mask(base, amp, cell, s, sharp=2.0, rough=8, extra=ex)
        depth = np.exp(-np.clip(Y - h[None, :], 0, None) / 90)
        light = 0.5 + (smooth(-0.5, 0.5, -np.gradient(smooth1(h, 14)))[None, :] - 0.5) * depth
        snow = smooth(0.5, 0.7, warp(fbm(30, 60, 5, s + 5), 30, 40, s + 6) + light * 0.25)
        rock = col(70, 78, 96) * (0.6 + 0.6 * light[..., None])
        snowc = c_ * (0.7 + 0.5 * light[..., None])
        img = mix(img, (rock * (1 - snow[..., None]) + snowc * snow[..., None]) * (0.85 + 0.3 * fbm(16, 40, 4, s + 2))[..., None], m)
        img = add(img, col(210, 225, 245), warp(fbm(360, 70, 5, s + 3), 80, 160, s + 4) * np.exp(-((Y - base) / 60) ** 2) * 0.35)
    img = add(img, col(230, 240, 255), np.exp(-np.hypot(X - 1160, Y - 120) / 160) * 0.25)
    # acantilado tallado a la izquierda
    cliff = polys([[(0, 0), (520, 0), (470, 120), (430, 300), (470, 480), (420, 650), (520, 900), (0, 900)]], rough=30, cell=50, seed=30, soft=1.5)
    bands = 0.75 + 0.25 * np.sin(Y * 0.06 + fbm(80, 400, 3, 31) * 6) * smooth(0.3, 0.6, fbm(200, 30, 3, 32))
    grooves = 0.85 + 0.15 * smooth(0.4, 0.6, warp(fbm(40, 160, 4, 33), 30, 60, 34))
    stone = col(70, 66, 64) * (bands * grooves * (0.75 + 0.4 * fbm(14, 14, 4, 34)))[..., None]
    img = mix(img, stone, cliff)
    edge = np.clip(cliff - warp(cliff, 8, 20, 35), 0, 1)
    img = add(img, col(200, 215, 240), edge * 0.5)
    img = mix(img, col(220, 230, 245), cliff * smooth(0.6, 0.8, fbm(30, 12, 4, 36)) * smooth(0.4, 1, yy) * 0.6)
    glow = np.exp(-np.hypot(X - 300, (Y - 640) * 1.4) / 70)
    img = add(img, col(255, 180, 90), glow * 0.7)
    img = add(img, col(240, 245, 255), particles(380, 0, H, 1.5, 37) * 0.55)
    img = add(img, col(200, 215, 235), warp(fbm(500, 160, 5, 38), 200, 300, 39) * smooth(0.55, 1, yy) * 0.3)
    return img


SCENES = {"freljord": freljord, "shurima": shurima, "void": void, "noxus": noxus, "targon": targon}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCENES:
        finish(SCENES[name](), OUT / f"{name}.jpg", vig=0.6)
