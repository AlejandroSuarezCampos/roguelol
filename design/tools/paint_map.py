"""Pinta el pergamino del mapa de expedición (Islas de la Sombra), vertical, al estilo de Slay the Spire.

Papel envejecido, manchas, bordes quemados y costas a tinta. Los nodos y caminos los dibuja la UI encima.
Uso (desde design/):  python tools/paint_map.py   ->  assets/map-shadow-isles.jpg (1000×2160)
"""
import pathlib
import numpy as np
import paintlib as P

P.setup(1000, 2160)
from paintlib import *  # noqa: E402,F401

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "map-shadow-isles.jpg"
INK = col(48, 36, 24)

# papel: tono base con fibras, vetas y variación de pigmento
paper = col(206, 184, 140) * (0.86 + 0.18 * fbm(260, 260, 6, 1))[..., None]
paper = paper * (0.96 + 0.06 * fbm(3, 60, 3, 2))[..., None]                         # fibras verticales
img = paper * (1 - 0.1 * smooth(0.55, 0.8, fbm(90, 90, 5, 3)))[..., None]

# manchas de agua (anillos más oscuros en el borde)
for i, (cx, cy, r) in enumerate([(220, 380, 150), (780, 1150, 210), (300, 1700, 170), (700, 300, 90), (160, 1100, 110)]):
    d = np.hypot(X - cx, (Y - cy) * 1.1) + (fbm(60, 60, 4, 10 + i) - 0.5) * 70
    img = mix(img, col(150, 118, 78), (smooth(r - 22, r, d) * smooth(r + 8, r, d) * 0.35 + smooth(r, 0, d) * 0.06))

# islas: tierra un poco más oscura, costa a tinta con líneas de oleaje concéntricas
land = warp(fbm(330, 330, 6, 20), 160, 260, 21)
coast = land - 0.53
img = mix(img, col(176, 152, 108), smooth(0.0, 0.02, coast) * 0.6)
img = mix(img, col(150, 128, 92), smooth(0.03, 0.1, coast) * smooth(0.5, 0.8, fbm(30, 30, 4, 22)) * 0.4)  # sombreado de relieve
img = mix(img, INK, (1 - smooth(0.0, 0.0045, np.abs(coast))) * 0.75)
for k in (0.025, 0.05, 0.08):                                                      # oleaje alrededor de la costa
    img = mix(img, INK, (1 - smooth(0.0, 0.0025, np.abs(coast + k))) * (0.32 - k * 2.5))
# trazos de agua sueltos
waves = smooth(0.0, 0.003, np.abs(np.sin(Y * 0.09 + fbm(80, 30, 3, 23) * 9) - 0.98))
img = mix(img, INK, (1 - waves) * (coast < -0.11) * smooth(0.62, 0.7, fbm(60, 20, 3, 24)) * 0.25)

# retícula de cartógrafo y rosa de los vientos discreta
grid = (1 - smooth(0, 1.2, np.abs(((X + 40) % 250) - 125) - 124)) + (1 - smooth(0, 1.2, np.abs(((Y + 60) % 250) - 125) - 124))
img = mix(img, INK, np.clip(grid, 0, 1) * 0.08)
cx, cy = 840, 1960
a, rr = np.arctan2(Y - cy, X - cx), np.hypot(X - cx, Y - cy)
star = np.abs(np.cos(a * 4)) ** 8 * 80 + 18
img = mix(img, INK, (rr < star) * (rr < 90) * 0.16)
img = mix(img, INK, (1 - smooth(0, 1.5, np.abs(rr - 95))) * 0.2)

# niebla negra: velo verdoso que se espesa hacia el jefe (arriba)
mist = warp(fbm(300, 300, 6, 30), 200, 300, 31)
img = mix(img, col(120, 150, 128), smooth(0.5, 0.8, mist) * (1 - smooth(0.0, 0.45, yy)) * 0.35)

# bordes quemados y oscurecidos
edge = np.minimum(np.minimum(X, W - X), np.minimum(Y, H - Y)) + (fbm(40, 40, 5, 40) - 0.5) * 60
img = mix(img, col(120, 86, 50), smooth(70, 0, edge) * 0.7)
img = mix(img, col(30, 18, 10), smooth(20, -6, edge))

finish(img, OUT, vig=0.35, quality=84)
