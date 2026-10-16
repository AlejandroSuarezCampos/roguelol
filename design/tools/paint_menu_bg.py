"""Pinta el fondo del menú (Islas de la Sombra de noche) como imagen raster.

Ruido fractal con deformación de dominio, luz volumétrica, siluetas erosionadas y un pase
final de "pincel" (mediana + textura de lienzo). Sin formas vectoriales a la vista.
Uso:  python tools/paint_menu_bg.py   (desde design/)  ->  assets/menu-bg.jpg
"""
import pathlib
import numpy as np
from PIL import Image, ImageDraw
import paintlib as P

P.setup(1920, 1080)
from paintlib import *  # noqa: E402,F401  (X, Y, yy, W, H y utilidades)

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "menu-bg.jpg"
HZ = 0.63 * H                      # horizonte
MX, MY, MR = 1370.0, 250.0, 96.0   # luna


def noise(cx, cy, seed):
    """Ruido de valor a tamaño completo con celdas cx×cy (anisótropo sin artefactos)."""
    r = np.random.default_rng(seed)
    g = (r.random((max(3, int(H / cy) + 2), max(3, int(W / cx) + 2))) * 255).astype(np.uint8)
    return np.asarray(Image.fromarray(g).resize((W, H), Image.BICUBIC), np.float32) / 255


def fbm(cx, cy=None, octaves=5, seed=0, gain=0.5):
    cy = cy or cx
    acc, amp, tot = np.zeros((H, W), np.float32), 1.0, 0.0
    for o in range(octaves):
        acc += amp * noise(max(cx / 2 ** o, 2), max(cy / 2 ** o, 2), seed * 37 + o)
        tot += amp
        amp *= gain
    return acc / tot


def sample(a, xs, ys):
    """Muestreo bilineal (para deformar el dominio)."""
    xs = np.clip(xs, 0, W - 1.001)
    ys = np.clip(ys, 0, H - 1.001)
    x0, y0 = xs.astype(int), ys.astype(int)
    fx, fy = xs - x0, ys - y0
    if a.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy)
            + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)


def warp(a, amount, cell, seed):
    return sample(a, X + (fbm(cell, cell, 4, seed) - 0.5) * amount, Y + (fbm(cell, cell, 4, seed + 1) - 0.5) * amount)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def col(*c):
    return np.array(c, np.float32) / 255


def mix(img, color, a):
    return img * (1 - a[..., None]) + color * a[..., None]


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


d = np.hypot(X - MX, Y - MY)

# --- cielo -----------------------------------------------------------------
t = np.clip(yy / (HZ / H), 0, 1)
img = col(3, 9, 15) * (1 - t[..., None] ** 1.3) + col(20, 66, 66) * (t[..., None] ** 1.3)
img += col(60, 140, 130) * (np.exp(-d / 360) * 0.5)[..., None]
img += col(25, 60, 70) * ((fbm(700, 500, 5, 1) - 0.5) * 0.35)[..., None]       # variación de pincelada

# luna con mares y borde suave
disc = smooth(MR + 3, MR - 3, d)
maria = warp(fbm(60, 60, 5, 3), 30, 90, 4)
img = mix(img, col(208, 228, 218) * (0.78 + 0.32 * maria)[..., None], disc * 0.95)
img += col(150, 220, 205) * (np.exp(-((d - MR) / 14) ** 2) * 0.25 * (d > MR))[..., None]

# nubes con deformación de dominio, iluminadas desde la luna
base = fbm(900, 260, 6, 5)
cl = warp(base, 260, 380, 6)
cl = smooth(0.46, 0.74, cl) * (1 - smooth(0.42, 0.62, yy))
light = 0.18 + 1.6 * np.exp(-d / 380)
img = mix(img, col(26, 64, 68) * light[..., None], cl * 0.9)
edge = np.clip(cl - warp(cl, 18, 60, 8), 0, 1)                                  # bordes plateados
img += col(140, 210, 195) * (edge * 2.2 * np.exp(-d / 500))[..., None]
veil = warp(fbm(500, 70, 5, 9), 120, 200, 10)
veil = smooth(0.5, 0.78, veil) * np.exp(-((Y - MY - 10) / 95) ** 2)           # jirón cruzando la luna
img = mix(img, col(70, 120, 115) * (0.5 + np.exp(-d / 220))[..., None], veil * 0.6)

# rayos de luna a través de la niebla
ang = np.arctan2(Y - MY, X - MX)
rays = np.asarray(Image.fromarray((np.random.default_rng(12).random((1, 34)) * 255).astype(np.uint8)).resize((W, 1), Image.BICUBIC), np.float32)[0][((ang + np.pi) / (2 * np.pi) * (W - 1)).astype(int)] / 255
img += col(80, 160, 150) * (blur(smooth(0.6, 1, rays), 6) * np.exp(-d / 700) * smooth(MY, MY + 300, Y) * 0.07)[..., None]

# --- islas lejanas con perspectiva atmosférica -----------------------------
for base_y, amp, cell, c_, s, tex in [(HZ - 6, 135, 650, col(24, 64, 64), 21, 0.08),
                                      (HZ + 6, 95, 380, col(13, 40, 42), 22, 0.12),
                                      (HZ + 16, 60, 220, col(6, 20, 22), 23, 0.16)]:
    r = fbm(cell, 4000, 6, s)[0]
    r = 1 - np.abs(r * 2 - 1)
    h = base_y - amp * r ** 1.7 * (0.5 + 0.5 * fbm(cell * 3, 4000, 2, s + 40)[0])
    hd = h[None, :] + (fbm(14, 14, 3, s + 5) - 0.5) * 9                         # borde rugoso
    m = smooth(-2, 2, Y - hd) * (Y < HZ + 34)
    texture = 1 + (fbm(60, 30, 4, s + 9) - 0.5) * tex * 4
    img = mix(img, c_ * texture[..., None], m)
    fog = warp(fbm(420, 90, 5, s + 7), 80, 160, s + 70) * np.exp(-((Y - base_y - 4) / 48) ** 2)
    img += col(45, 130, 115) * (fog * 0.3)[..., None]

# --- ruina de Helia, lejana y comida por la niebla ---------------------------
ruin = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(ruin)
gx, gy = 360, int(HZ + 14)
dr.polygon([(gx - 250, gy + 6), (gx - 170, gy - 50), (gx - 40, gy - 78), (gx + 140, gy - 66), (gx + 300, gy - 18), (gx + 380, gy + 6)], fill=255)
rr = np.random.default_rng(4)
for x0, w_, h_ in [(-130, 30, 170), (-75, 22, 115), (-30, 40, 255), (40, 26, 160), (92, 18, 95), (140, 32, 200), (200, 20, 120)]:
    x = gx + x0
    top = gy - 70 - h_
    dr.polygon([(x, gy - 50), (x + 3, top), (x + w_ / 2, top - h_ * 0.3 * rr.random()), (x + w_ - 2, top + rr.random() * 25), (x + w_, gy - 50)], fill=255)
dr.polygon([(gx - 130, gy - 150), (gx + 172, gy - 170), (gx + 172, gy - 152), (gx + 60, gy - 140), (gx - 130, gy - 132)], fill=255)
rm = np.asarray(ruin, np.float32) / 255
rm = warp(rm, 14, 22, 30)                                                       # bordes irregulares
rm *= smooth(0.3, 0.45, fbm(16, 16, 4, 31) + 0.22 * (Y > gy - 90))              # derrumbes y huecos
rm = blur(rm, 1.4)
haze = smooth(gy - 330, gy, Y) * 0.35                                           # la base se pierde en la bruma
img = mix(img, col(4, 13, 15) * (0.85 + 0.3 * fbm(30, 30, 3, 33))[..., None], np.clip(rm * 1.25, 0, 1) * (0.97 - haze))
rim = np.clip(rm - sample(rm, X - 4, Y + 2), 0, 1)
img += col(110, 190, 175) * (blur(rim, 1.2) * 0.22)[..., None]
for wx, wy in [(gx + 6, gy - 240), (gx + 54, gy - 168), (gx - 118, gy - 168), (gx + 152, gy - 200)]:
    g = np.hypot((X - wx) / 1.0, (Y - wy) / 1.4)
    img += col(120, 255, 190) * (np.exp(-(g / 4.5) ** 2) * 0.9 + np.exp(-g / 45) * 0.14)[..., None]
img += col(40, 140, 110) * (np.exp(-np.hypot(X - gx, (Y - gy + 120) * 1.6) / 260) * 0.18)[..., None]

# --- mar ---------------------------------------------------------------------
sea = smooth(HZ + 14, HZ + 20, Y)
st = np.clip((Y - HZ) / (H - HZ), 0, 1)
water = col(7, 28, 32) * (1 - st[..., None]) + col(1, 5, 7) * st[..., None]
img = img * (1 - sea[..., None]) + water * sea[..., None]
waves = warp(fbm(240, 7, 6, 40), 6, 40, 41)
img += col(45, 100, 98) * (smooth(0.58, 0.85, waves) * sea * (1 - st) ** 1.5 * 0.45)[..., None]
width = 22 + (Y - HZ) * 0.6
glints = smooth(0.55, 0.8, warp(fbm(70, 4, 5, 42), 4, 20, 43))
refl = np.exp(-((X - MX + (fbm(200, 30, 3, 44) - 0.5) * 60) / width) ** 2) * glints * sea * (1 - st * 0.75)
img += col(175, 228, 212) * (refl * 0.8)[..., None]
mirror = sample(img, X, 2 * (HZ + 16) - Y)                                      # reflejo tenue del cielo/isla
img = img * (1 - sea[..., None] * 0.22) + mirror * (sea * 0.22 * (1 - st))[..., None]

# --- Niebla Negra --------------------------------------------------------------
m = warp(fbm(520, 260, 6, 50), 300, 420, 51)
mist = smooth(0.48, 0.8, m) * smooth(0.5, 1.0, yy) * (0.5 + 0.5 * smooth(0.05, 0.4, np.abs(X / W - 0.5)))
img += col(45, 185, 145) * (mist * 0.36)[..., None]
wisps = warp(fbm(160, 40, 5, 52), 120, 160, 53)
img += col(80, 230, 180) * (smooth(0.62, 0.86, wisps) * smooth(0.55, 0.95, yy) * 0.16)[..., None]
img = mix(img, col(2, 12, 13), smooth(0.82, 1.0, yy) * 0.6)

# --- almas y polvo dorado (luz suave, sin polígonos) ---------------------------
r = np.random.default_rng(99)
glow = np.zeros((H, W), np.float32)
gold = np.zeros((H, W), np.float32)
patch_y, patch_x = np.mgrid[0:40, 0:40]
for layer, n, ymin, ymax, smax in [(glow, 220, HZ - 80, H, 3.2), (gold, 70, 90, HZ - 60, 2.4)]:
    for _ in range(n):
        px, py = r.random() * (W - 40), ymin + r.random() * (ymax - ymin - 40)
        s = 0.8 + r.random() * smax
        x0, y0 = int(px), int(py)
        layer[y0:y0 + 40, x0:x0 + 40] += np.exp(-((patch_x - 20) ** 2 + (patch_y - 20) ** 2) / (2 * s * s)) * (0.3 + r.random())
img += col(110, 255, 205) * (np.clip(glow, 0, 1) * 0.5 + blur(np.clip(glow, 0, 1), 8) * 0.5)[..., None]
img += col(240, 200, 120) * (np.clip(gold, 0, 1) * 0.55 + blur(np.clip(gold, 0, 1), 10) * 0.6)[..., None]

# --- acabado ---
finish(img, OUT, vig=0.78, quality=88)
