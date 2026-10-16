"""Utilidades de pintura por código (ruido, deformación, mezcla y acabado pictórico).

Llama a setup(w, h) antes de usar el resto; X, Y, yy quedan como globales del módulo.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W = H = 0
X = Y = yy = None


def setup(w, h):
    global W, H, X, Y, yy
    W, H = w, h
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    yy = Y / H


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


def line(cell, octaves, seed):
    """fbm de una dimensión (perfil horizontal) de longitud W."""
    return fbm(cell, 10 ** 5, octaves, seed)[0]


def sample(a, xs, ys):
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


def add(img, color, a):
    return img + color * a[..., None]


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def vgrad(top, bottom, y0=0.0, y1=1.0, power=1.0):
    t = np.clip((yy - y0) / (y1 - y0), 0, 1) ** power
    return top * (1 - t[..., None]) + bottom * t[..., None]


def polys(polygons, rough=10, cell=20, seed=0, soft=1.2):
    """Rasteriza polígonos y los vuelve orgánicos: borde deformado, erosión y desenfoque."""
    im = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(im)
    for p in polygons:
        dr.polygon([tuple(map(float, q)) for q in p], fill=255)
    m = np.asarray(im, np.float32) / 255
    if rough:
        m = warp(m, rough, cell, seed)
    return blur(m, soft)


def smooth1(h, sigma):
    """Suaviza un perfil 1D (evita franjas verticales al derivarlo)."""
    k = np.exp(-np.arange(-3 * sigma, 3 * sigma + 1) ** 2 / (2 * sigma * sigma))
    return np.convolve(np.pad(h, 3 * sigma, mode="edge"), k / k.sum(), "valid")


def ridge_mask(base, amp, cell, seed, sharp=1.6, rough=8, extra=None):
    """Silueta de cordillera: 1 bajo la cresta. Devuelve también el perfil suavizado."""
    r = line(cell, 6, seed)
    r = 1 - np.abs(r * 2 - 1)
    h = base - amp * r ** sharp * (0.5 + 0.5 * line(cell * 3, 2, seed + 40))
    if extra is not None:
        h = h - extra
    h = smooth1(h, 2)
    hd = h[None, :] + (fbm(14, 14, 3, seed + 5) - 0.5) * rough
    return smooth(-2, 2, Y - hd), h


def particles(n, ymin, ymax, smax, seed, xmin=0, xmax=None):
    xmax = xmax or W
    r = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    py_, px_ = np.mgrid[0:40, 0:40]
    for _ in range(n):
        x0 = int(xmin + r.random() * (xmax - xmin - 40))
        y0 = int(ymin + r.random() * max(1, ymax - ymin - 40))
        if 0 <= x0 < W - 40 and 0 <= y0 < H - 40:
            s = 0.8 + r.random() * smax
            out[y0:y0 + 40, x0:x0 + 40] += np.exp(-((px_ - 20) ** 2 + (py_ - 20) ** 2) / (2 * s * s)) * (0.3 + r.random())
    return np.clip(out, 0, 1)


def finish(img, path, vig=0.75, quality=86):
    """Viñeta, compresión de luces, pase de pincel, trama de lienzo y grano."""
    v = np.hypot((X - W / 2) / (W * 0.62), (Y - H * 0.46) / (H * 0.72))
    img = img * (1 - smooth(0.5, 1.15, v) * vig)[..., None]
    img = img / (1 + img * 0.3) * 1.2
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.UnsharpMask(2, 40, 2))
    a = np.asarray(im, np.float32) / 255
    canvas = (fbm(5, 5, 2, 70) - 0.5) * 0.05 + (fbm(3, 40, 2, 71) - 0.5) * 0.03
    a = a * (1 + canvas[..., None]) + np.random.default_rng(5).normal(0, 0.01, (H, W))[..., None]
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(path, quality=quality, optimize=True, progressive=True)
    print(path)
