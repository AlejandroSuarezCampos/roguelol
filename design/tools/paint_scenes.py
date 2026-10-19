"""Pinta escenas de fondo para pantallas de la expedición: hoguera (Descanso) y tienda del mercader.

Uso (desde design/):  python tools/paint_scenes.py [camp shop]  ->  assets/scenes/<escena>.jpg (1600×900)
"""
import pathlib
import sys
import numpy as np
import paintlib as P

P.setup(1600, 900)
from paintlib import *  # noqa: E402,F401
from paint_regions import trees  # noqa: E402  (mismos pinos dentados)

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "scenes"


def flame(cx, base, w, h, seed):
    """Llama: lágrima deformada por ruido que sube."""
    nx = (X - cx) / w
    ny = (base - Y) / h
    turb = (fbm(30, 20, 4, seed) - 0.5) * 0.9
    shape = 1 - np.hypot(nx * (1.2 + ny * 1.6) + turb * ny, (ny - 0.45) * 1.1)
    return smooth(0.35, 0.65, shape) * (ny > -0.05) * (ny < 1.1)


def camp():
    img = vgrad(col(4, 12, 18), col(16, 40, 44), 0, 0.7, 1.2)
    img = add(img, col(40, 90, 90), smooth(0.55, 0.85, warp(fbm(500, 160, 6, 1), 200, 300, 2)) * (1 - smooth(0.2, 0.6, yy)) * 0.25)
    img = add(img, col(255, 255, 255), particles(160, 0, 300, 0.8, 3) * 0.5)
    far = polys(trees(70, 600, 160, 320, 4), rough=6, cell=10, seed=5, soft=1.2)
    img = mix(img, col(10, 26, 30), far * 0.9)
    img = add(img, col(60, 120, 115), warp(fbm(400, 80, 5, 6), 120, 180, 7) * np.exp(-((Y - 600) / 60) ** 2) * 0.3)
    near = polys(trees(10, 900, 420, 640, 8, xmax=360) + trees(10, 900, 420, 640, 9, xmin=1240), rough=10, cell=14, seed=10)
    img = mix(img, col(3, 8, 10), near)
    ground = smooth(640, 700, Y)
    img = mix(img, col(18, 22, 20) * (0.8 + 0.4 * fbm(30, 12, 4, 11))[..., None], ground)
    # luz de la hoguera: cálida, se derrama sobre el suelo y los troncos cercanos
    CX, CY = 800.0, 720.0
    d = np.hypot(X - CX, (Y - CY) * 1.6)
    glow = np.exp(-d / 330)
    img = img * (1 + col(1.6, 0.9, 0.4) * glow[..., None] * 1.6)
    img = add(img, col(255, 140, 50), np.exp(-d / 120) * 0.35)
    # troncos
    logs = polys([[(690, 760), (900, 700), (912, 724), (702, 786)], [(700, 700), (910, 770), (896, 794), (688, 726)]], rough=4, cell=10, seed=12, soft=1)
    img = mix(img, col(40, 22, 12) * (0.7 + 0.5 * fbm(8, 30, 3, 13))[..., None], logs)
    img = add(img, col(255, 120, 40), logs * smooth(760, 700, Y) * 0.5)
    # llamas en capas
    f1 = flame(CX, 740, 120, 250, 14)
    f2 = flame(CX + 6, 740, 80, 180, 15)
    f3 = flame(CX - 4, 740, 40, 110, 16)
    img = mix(img, col(230, 80, 20), f1 * 0.9)
    img = mix(img, col(255, 160, 40), f2 * 0.95)
    img = mix(img, col(255, 236, 170), f3)
    img = add(img, col(255, 150, 60), particles(140, 300, 720, 1.2, 17, 600, 1000) * 0.9)
    img = add(img, col(80, 140, 130), warp(fbm(500, 140, 5, 18), 200, 300, 19) * smooth(0.6, 1.0, yy) * 0.12)
    return img


def shop():
    # interior de la tienda: lona con pliegues, linternas, estanterías y alfombra
    folds = np.sin(X * 0.035 + fbm(120, 400, 4, 1) * 6) * 0.5 + 0.5
    img = col(58, 30, 26) * (0.55 + 0.45 * folds)[..., None] * (0.8 + 0.3 * fbm(40, 80, 4, 2))[..., None]
    img = mix(img, col(30, 16, 14), smooth(0.5, 0.0, yy) * 0.5)
    rr = np.random.default_rng(3)
    shelves = []
    for y in (300, 430):
        shelves.append([(150, y), (1450, y), (1450, y + 16), (150, y + 16)])
        for x in rr.uniform(170, 1430, 26):
            w_, h_ = rr.uniform(14, 34), rr.uniform(30, 80)
            neck = rr.random() < 0.6
            shelves.append([(x, y), (x, y - h_ * (0.7 if neck else 1)), (x + w_ * 0.3, y - h_ * (0.75 if neck else 1)), (x + w_ * 0.35, y - h_), (x + w_ * 0.65, y - h_), (x + w_ * 0.7, y - h_ * (0.75 if neck else 1)), (x + w_, y - h_ * (0.7 if neck else 1)), (x + w_, y)])
    sh = polys(shelves, rough=2, cell=6, seed=4, soft=0.8)
    tint = col(70, 40, 30) * (0.6 + 0.6 * fbm(12, 12, 3, 5))[..., None]
    img = mix(img, tint, sh * 0.95)
    img = add(img, col(80, 200, 160), sh * particles(50, 200, 440, 1.0, 6, 150, 1450) * 0.8)       # frascos brillando
    for lx, ly in [(330, 150), (800, 110), (1270, 150)]:
        d = np.hypot(X - lx, (Y - ly) * 1.2)
        img = img * (1 + col(1.4, 0.9, 0.5) * np.exp(-d / 360)[..., None] * 0.9)
        img = add(img, col(255, 200, 110), np.exp(-d / 26) * 1.1 + np.exp(-d / 90) * 0.25)
        img = mix(img, col(30, 20, 14), (np.abs(X - lx) < 2) * (Y < ly - 24) * 1.0)
    # mostrador y alfombra con dibujo
    counter = smooth(560, 572, Y)
    img = mix(img, col(48, 28, 18) * (0.75 + 0.35 * fbm(6, 60, 3, 7))[..., None], counter * (Y < 640))
    rug = smooth(636, 648, Y)
    pattern = 0.5 + 0.5 * np.sin((X - 800) * 0.04) * np.sin((Y - 640) * 0.08 + np.sin(X * 0.01) * 2)
    rugc = col(110, 28, 26) * (1 - pattern[..., None]) + col(170, 120, 50) * pattern[..., None]
    img = mix(img, rugc * (0.6 + 0.3 * fbm(10, 10, 3, 8))[..., None], rug)
    img = add(img, col(255, 210, 140), particles(90, 0, 900, 1.0, 9) * 0.25)
    return img


SCENES = {"camp": camp, "shop": shop}

if __name__ == "__main__":
    for name in sys.argv[1:] or SCENES:
        finish(SCENES[name](), OUT / f"{name}.jpg", vig=0.65)
